// @ts-nocheck
import React, { useState, useMemo } from "react";
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
  Zap,
  Sliders,
  Flame,
  Activity,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
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

const TIER_COLOR: Record<string, string> = {
  critical: THEME.rust,
  building: THEME.gold,
  healthy: THEME.accent,
  excellent: THEME.sage,
};

export const EmergencyFundTab = ({ state, metrics }: any) => {
  const ef = metrics.emergencyFund;
  const [burnMode, setBurnMode] = useState<"standard" | "survival">("standard");
  const [customMonthlyAllocation, setCustomMonthlyAllocation] = useState<number>(0);

  const data = useMemo(() => {
    const bankBalance = ef.cashInBanks;
    const fdValue = ef.nearTermFDValue;
    const liquidMF = ef.liquidMFValue;
    const prepaidBalance = Math.max(0, ef.prepaidValue);
    const totalLiquid = ef.liquidAssets;

    // Expense breakdown for table
    const expenseBreakdown = [];
    const emis = (state.loansTaken || []).reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    if (emis > 0) expenseBreakdown.push({ label: "Loan EMIs", amount: emis, icon: CreditCard, essential: true });

    const rent = (state.rentedProperties || [])
      .filter((p: any) => p.isActive !== false)
      .reduce((s: number, p: any) => s + getEffectiveRent(p), 0);
    if (rent > 0) expenseBreakdown.push({ label: "Rent & Housing", amount: rent, icon: Home, essential: true });

    const sipTotal = (state.sips || [])
      .filter((s: any) => s.status !== "stopped")
      .reduce((s: number, si: any) => s + Number(si.amount || 0), 0);
    if (sipTotal > 0) expenseBreakdown.push({ label: "SIP Investments", amount: sipTotal, icon: TrendingUp, essential: false });

    const subTotal = (state.subscriptions || [])
      .filter((s: any) => !s.paused)
      .reduce((s: number, sub: any) => {
        const amt = Number(sub.amount || 0);
        if (sub.cycle === "yearly") return s + amt / 12;
        if (sub.cycle === "quarterly") return s + amt / 3;
        return s + amt;
      }, 0);
    if (subTotal > 0)
      expenseBreakdown.push({ label: "Subscriptions & Media", amount: subTotal, icon: RefreshCw, essential: false });

    const recTotal = (state.recurringExpenses || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    if (recTotal > 0)
      expenseBreakdown.push({ label: "Recurring Utilities & Bills", amount: recTotal, icon: ClipboardList, essential: true });

    const insTotal = [
      ...(state.lic || []),
      ...(state.termPlans || []),
      ...(state.investmentPlans || []),
    ].reduce((s: number, p: any) => s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium) / 12, 0);
    if (insTotal > 0)
      expenseBreakdown.push({ label: "Insurance Premiums", amount: insTotal, icon: HeartPulse, essential: true });

    const standardExpense = ef.monthlyExpense || expenseBreakdown.reduce((s, e) => s + e.amount, 0) || 50000;
    const survivalExpense = Math.max(
      standardExpense * 0.65,
      expenseBreakdown.filter((e) => e.essential).reduce((s, e) => s + e.amount, 0)
    );

    const activeExpense = burnMode === "survival" ? survivalExpense : standardExpense;
    const monthsCovered = activeExpense > 0 ? totalLiquid / activeExpense : 0;
    const targetMonths = ef.targetMonths || 6;
    const targetAmount = activeExpense * targetMonths;
    const gap = Math.max(0, targetAmount - totalLiquid);
    const coveragePct = targetAmount > 0 ? (totalLiquid / targetAmount) * 100 : 0;

    // Liquidity Tiers
    const tier1 = bankBalance; // T+0
    const tier2 = liquidMF; // T+1
    const tier3 = fdValue + prepaidBalance; // T+3

    return {
      bankBalance,
      fdValue,
      liquidMF,
      prepaidBalance,
      totalLiquid,
      standardExpense,
      survivalExpense,
      monthlyExpense: activeExpense,
      monthsCovered,
      targetMonths,
      targetAmount,
      gap,
      coveragePct,
      expenseBreakdown,
      tier1,
      tier2,
      tier3,
    };
  }, [state, ef, burnMode]);

  const tier =
    data.monthsCovered < 1
      ? "critical"
      : data.monthsCovered < 3
        ? "building"
        : data.monthsCovered < 6
          ? "healthy"
          : "excellent";

  const healthColor = TIER_COLOR[tier];
  const healthLabel =
    data.monthsCovered < 1
      ? "Critical Shortfall"
      : data.monthsCovered < 3
        ? "Building Reserve"
        : data.monthsCovered < 6
          ? "Adequate Runway"
          : "Fortified & Safe";

  const animatedMonthsCovered = useAnimatedNumber(data.monthsCovered);

  const monthlySurplus = Math.max(0, (metrics.monthIncome || 0) - (metrics.monthExpense || 0));
  const activeMonthlyAllocation = customMonthlyAllocation > 0 ? customMonthlyAllocation : monthlySurplus;
  const monthsToTarget = data.gap > 0 && activeMonthlyAllocation > 0 ? data.gap / activeMonthlyAllocation : null;

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Instant emergency runway, liquidity tiers, and stress-test simulation"
        rightElement={
          /* Burn Mode Toggle */
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => setBurnMode("standard")}
              className={`demat-portfolio-pill ${burnMode === "standard" ? "active" : ""}`}
              style={{ fontSize: 11, padding: "5px 12px" }}
            >
              Standard Lifestyle Burn
            </button>
            <button
              onClick={() => setBurnMode("survival")}
              className={`demat-portfolio-pill ${burnMode === "survival" ? "active" : ""}`}
              style={{
                fontSize: 11,
                padding: "5px 12px",
                ...(burnMode === "survival" ? { background: THEME.gold, borderColor: THEME.gold } : {}),
              }}
              title="Survival Mode strips non-essential discretionary expenses"
            >
              ⚡ Bare-Bones Survival Mode
            </button>
          </div>
        }
      >
        Emergency Fund & Runway
      </SectionTitle>

      {/* Main Health Cockpit Card */}
      <Card
        variant="base"
        style={{
          marginBottom: 20,
          padding: "clamp(24px, 4vw, 36px)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 94%, var(--t-accent) 6%), var(--surface-0))",
          border: `1px solid ${THEME.line}`,
          borderTop: `4px solid ${healthColor}`,
          borderRadius: "var(--radius-xl)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            flexWrap: "wrap",
          }}
        >
          {/* Visual Speedometer / Circular Gauge */}
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: "50%",
              flexShrink: 0,
              background: `conic-gradient(${healthColor} 0%, ${healthColor} ${Math.min(data.coveragePct, 100) * 3.6}deg, var(--t-line) 0deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 20px color-mix(in srgb, ${healthColor} 22%, transparent)`,
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: "50%",
                background: "var(--surface-0)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid var(--t-line)`,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  fontWeight: 900,
                  color: healthColor,
                  lineHeight: 1,
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
                  letterSpacing: "0.08em",
                  marginTop: 2,
                }}
              >
                months
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: healthColor,
                  background: `color-mix(in srgb, ${healthColor} 14%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${healthColor} 30%, transparent)`,
                  padding: "3px 10px",
                  borderRadius: "var(--radius-xs)",
                }}
              >
                {healthLabel}
              </span>
              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                {burnMode === "survival" ? "⚡ Calculated on Bare-Bones Survival Mode" : "Standard Full Expense Mode"}
              </span>
            </div>

            <div style={{ fontSize: 15, color: THEME.ink, marginBottom: 12, lineHeight: 1.4 }}>
              Your liquid assets of <strong>{fmtINRFull(data.totalLiquid)}</strong> can support you for{" "}
              <strong style={{ color: healthColor }}>{data.monthsCovered.toFixed(1)} months</strong> without any active income.
              {data.monthsCovered < 6 ? (
                <span style={{ color: THEME.rust, fontWeight: 600 }}>
                  {" "}
                  Target buffer is at least 6.0 months ({fmtINRFull(data.targetAmount)}).
                </span>
              ) : (
                <span style={{ color: THEME.sage, fontWeight: 600 }}>
                  {" "}
                  Your financial runway is completely fortified!
                </span>
              )}
            </div>

            {/* Progress Track */}
            <div style={{ height: 10, borderRadius: 5, background: "var(--t-line)", overflow: "hidden", position: "relative", marginBottom: 6 }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, data.coveragePct)}%`,
                  background: `linear-gradient(90deg, ${healthColor}, color-mix(in srgb, ${healthColor} 70%, white))`,
                  borderRadius: 5,
                  transition: "width 0.8s var(--ease-premium)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted }}>
              <span>0m (Vulnerable)</span>
              <span style={{ fontWeight: 700, color: THEME.ink }}>6m Target Buffer</span>
              <span>12m+ (Bulletproof)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Primary Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Total Liquid Assets"
          value={fmtINRFull(data.totalLiquid)}
          numericValue={data.totalLiquid}
          formatValue={fmtINRFull}
          sub="Bank balances + liquid MF + instant FDs"
          icon={<IndianRupee />}
          color={THEME.sage}
        />
        <StatCard
          label={burnMode === "survival" ? "Survival Burn / Mo" : "Monthly Expenses"}
          value={fmtINRFull(data.monthlyExpense)}
          numericValue={data.monthlyExpense}
          formatValue={fmtINRFull}
          sub={burnMode === "survival" ? "Essential rent, EMIs & food" : "Active commitments & living cost"}
          icon={<Wallet />}
          color={THEME.gold}
        />
        <StatCard
          label="6-Month Target Buffer"
          value={fmtINRFull(data.targetAmount)}
          numericValue={data.targetAmount}
          formatValue={fmtINRFull}
          sub="Recommended peace-of-mind reserve"
          icon={<Target />}
          color={THEME.accent}
        />
        <StatCard
          label="Emergency Reserve Gap"
          value={data.gap > 0 ? fmtINRFull(data.gap) : "Fully Funded!"}
          numericValue={data.gap > 0 ? data.gap : undefined}
          formatValue={fmtINRFull}
          sub={data.gap > 0 ? "Shortfall to reach 6-month buffer" : "Zero emergency shortfall"}
          icon={data.gap > 0 ? <AlertTriangle /> : <CheckCircle2 />}
          color={data.gap > 0 ? THEME.rust : THEME.sage}
        />
      </div>

      {/* 3-Tier Liquidity Waterfall Architecture */}
      <Card style={{ marginBottom: 24, padding: 22 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: THEME.muted,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Zap size={14} color={THEME.accent} /> 3-Tier Liquidity Waterfall
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {/* Tier 1: Instant T+0 */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              background: `color-mix(in srgb, ${THEME.accent} 5%, var(--surface-0))`,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: THEME.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tier 1: T+0 Instant
              </span>
              <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>Immediate Access</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
              <Money value={data.tier1} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Savings bank accounts & cash in hand. Available 24x7 via UPI & ATM.
            </div>
          </div>

          {/* Tier 2: Near-Term T+1 */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              background: `color-mix(in srgb, ${THEME.sage} 5%, var(--surface-0))`,
              border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: THEME.sage, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tier 2: T+1 Liquid Funds
              </span>
              <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>Next Day Access</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
              <Money value={data.tier2} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Liquid mutual funds & overnight funds with high yield and fast redemption.
            </div>
          </div>

          {/* Tier 3: Secondary T+3 */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              background: `color-mix(in srgb, ${THEME.gold} 5%, var(--surface-0))`,
              border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Tier 3: T+3 Buffer
              </span>
              <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>Short-Term FD / Cards</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
              <Money value={data.tier3} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              FDs maturing within 90 days, sweep-in accounts, and prepaid card wallets.
            </div>
          </div>
        </div>
      </Card>

      {/* Stress-Test Simulation Scenarios */}
      <Card style={{ marginBottom: 24, padding: 22 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: THEME.muted,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Flame size={14} color={THEME.rust} /> Emergency Stress-Test Scenarios
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {/* Scenario 1: Sudden Income Pause */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ShieldAlert size={16} color={THEME.rust} />
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Sudden Job Loss (6 Mos)</div>
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
              Burn needed: <Money value={data.monthlyExpense * 6} variant="full" />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: data.totalLiquid >= data.monthlyExpense * 6 ? THEME.sage : THEME.rust }}>
              {data.totalLiquid >= data.monthlyExpense * 6
                ? "✓ Fully Protected: Liquid assets cover entire 6 months"
                : `✗ Deficit: Short by ${fmtINR(data.monthlyExpense * 6 - data.totalLiquid)}`}
            </div>
          </div>

          {/* Scenario 2: Medical Emergency Shock */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <HeartPulse size={16} color={THEME.pink} />
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Medical Out-of-Pocket (₹3L)</div>
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
              Liquid remaining: <Money value={Math.max(0, data.totalLiquid - 300000)} variant="full" />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: data.totalLiquid > 300000 ? THEME.sage : THEME.rust }}>
              {data.totalLiquid > 300000
                ? `✓ Runway after shock: ${((data.totalLiquid - 300000) / (data.monthlyExpense || 1)).toFixed(1)} months`
                : "✗ Critical: Liquid assets would be fully depleted"}
            </div>
          </div>

          {/* Scenario 3: Major Vehicle / Home Repair */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Home size={16} color={THEME.gold} />
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Major Repair Shock (₹1.5L)</div>
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
              Liquid remaining: <Money value={Math.max(0, data.totalLiquid - 150000)} variant="full" />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: data.totalLiquid > 150000 ? THEME.sage : THEME.rust }}>
              {data.totalLiquid > 150000
                ? `✓ Runway after repair: ${((data.totalLiquid - 150000) / (data.monthlyExpense || 1)).toFixed(1)} months`
                : "✗ Shortfall: Would require liquidating investments"}
            </div>
          </div>
        </div>
      </Card>

      {/* Monthly Expense Breakdown & Itemization */}
      {data.expenseBreakdown.length > 0 && (
        <Card style={{ marginBottom: 24, padding: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: THEME.muted,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PieChart size={14} color={THEME.accent} /> Monthly Expense Commitments
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.expenseBreakdown
              .sort((a, b) => b.amount - a.amount)
              .map((e, i) => {
                const totalExp = data.expenseBreakdown.reduce((s, x) => s + x.amount, 0);
                const pct = totalExp > 0 ? (e.amount / totalExp) * 100 : 0;
                return (
                  <div
                    key={i}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <e.icon size={16} color={THEME.accent} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                      {e.label}{" "}
                      {e.essential ? (
                        <span style={{ fontSize: 10, color: THEME.sage, fontWeight: 800 }}>(Essential)</span>
                      ) : (
                        <span style={{ fontSize: 10, color: THEME.muted }}>(Discretionary)</span>
                      )}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                      <Money value={e.amount} variant="full" />
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: THEME.muted,
                        minWidth: 40,
                        textAlign: "right",
                      }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Action Plan & Replenishment Simulator */}
      {data.gap > 0 && (
        <Card style={{ padding: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: THEME.muted,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TrendingUp size={14} color={THEME.sage} /> Replenishment & Gap Closure Plan
          </div>

          <div style={{ fontSize: 13, color: THEME.ink, marginBottom: 16 }}>
            To eliminate the remaining gap of <strong>{fmtINRFull(data.gap)}</strong> and reach your complete 6-month safety buffer:
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 14, borderRadius: 8, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>In 3 Months</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.accent }}>{fmtINR(data.gap / 3)}/mo</div>
            </div>
            <div style={{ padding: 14, borderRadius: 8, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>In 6 Months</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.sage }}>{fmtINR(data.gap / 6)}/mo</div>
            </div>
            <div style={{ padding: 14, borderRadius: 8, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>In 12 Months</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.gold }}>{fmtINR(data.gap / 12)}/mo</div>
            </div>
          </div>

          {monthsToTarget !== null && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                fontSize: 13,
                color: THEME.ink,
              }}
            >
              At your current monthly surplus of <strong>{fmtINRFull(activeMonthlyAllocation)}/mo</strong>, you will fully fund this gap in{" "}
              <strong>{Math.ceil(monthsToTarget)} months</strong> (by{" "}
              {new Date(Date.now() + Math.ceil(monthsToTarget) * 30.44 * 86400000).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
              ).
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
