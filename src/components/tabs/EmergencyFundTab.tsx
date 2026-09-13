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
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Plus,
  FileText,
  Printer,
  Sparkles,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Clock,
  Check,
  X,
  Smartphone,
  Building2,
  AlertCircle,
  Share2,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  getEffectiveRent,
  annualizePremium,
  getSubscriptionMonthlyEquivalent,
  loanOutstanding,
  EMERGENCY_FUND_TARGET_MONTHS,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Money } from "../ui/Money";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { BrandLogo } from "../ui/BrandLogos";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

const TIER_COLOR: Record<string, string> = {
  critical: THEME.rust,
  building: THEME.gold,
  healthy: THEME.accent,
  excellent: THEME.sage,
};

interface EmergencyFundTabProps {
  state: any;
  metrics: any;
  setTab?: (tab: string) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const EmergencyFundTab: React.FC<EmergencyFundTabProps> = ({
  state,
  metrics,
  setTab,
  showToast,
}) => {
  const ef = metrics?.emergencyFund || {};

  // Interactive UI States
  const [burnMode, setBurnMode] = useState<"standard" | "survival">("standard");
  const [targetMonths, setTargetMonths] = useState<number>(ef.targetMonths || 6);
  const [activeTierTab, setActiveTierTab] = useState<"all" | "tier1" | "tier2" | "tier3">("all");
  const [customMonthlyAllocation, setCustomMonthlyAllocation] = useState<number>(0);

  // What-If Trimmer States
  const [trimSIPs, setTrimSIPs] = useState<boolean>(false);
  const [trimSubs, setTrimSubs] = useState<boolean>(false);
  const [discretionaryCutPct, setDiscretionaryCutPct] = useState<number>(0);

  // Stress-Test Sandbox States
  const [activeShockScenario, setActiveShockScenario] = useState<
    "none" | "jobloss" | "medical" | "repair" | "blackswan" | "custom"
  >("none");
  const [customShockAmount, setCustomShockAmount] = useState<number>(300000);
  const [customJobLossMonths, setCustomJobLossMonths] = useState<number>(6);

  // Protocol Playbook Modal State
  const [showPlaybookModal, setShowPlaybookModal] = useState<boolean>(false);
  const [showBreakGlassDrawer, setShowBreakGlassDrawer] = useState<boolean>(false);

  // Primary Data Computations
  const data = useMemo(() => {
    const bankBalance = Number(ef.cashInBanks || 0);
    const fdValue = Number(ef.nearTermFDValue || 0);
    const liquidMF = Number(ef.liquidMFValue || 0);
    const prepaidBalance = Math.max(0, Number(ef.prepaidValue || 0));
    const totalLiquid = Number(ef.liquidAssets || (bankBalance + fdValue + liquidMF + prepaidBalance));

    // Itemized Bank Accounts (Tier 1)
    const bankAccounts = (state?.bankAccounts || []).filter(
      (a: any) => Number(a.balance || 0) > 0
    );

    // Itemized Liquid MFs (Tier 2)
    const liquidFunds = (state?.mutualFunds || []).filter((m: any) => {
      const cat = (m.category || m.type || "").toLowerCase();
      return (
        cat.includes("liquid") ||
        cat.includes("money market") ||
        cat.includes("overnight") ||
        cat.includes("ultra short")
      );
    });

    // Itemized Near-Term FDs (Tier 3: <= 90 days)
    const nowMs = Date.now();
    const nearTermFDs = (state?.fixedDeposits || []).filter((fd: any) => {
      if (!fd.maturityDate) return false;
      const matMs = new Date(fd.maturityDate + "T00:00:00").getTime();
      return matMs >= nowMs && matMs <= nowMs + 90 * 86400000;
    });

    // Other longer term FDs (Break-Glass reserves)
    const breakGlassFDs = (state?.fixedDeposits || []).filter((fd: any) => {
      if (!fd.maturityDate) return false;
      const matMs = new Date(fd.maturityDate + "T00:00:00").getTime();
      return matMs > nowMs + 90 * 86400000;
    });
    const breakGlassFDTotal = breakGlassFDs.reduce((s: number, f: any) => s + Number(f.principal || 0), 0);

    // Itemized Prepaid Cards
    const prepaidCards = (state?.prepaidCards || []).filter(
      (c: any) => Number(c.balance || 0) > 0
    );

    // Itemized Expense Breakdown
    const emis = (state?.loansTaken || [])
      .filter((l: any) => loanOutstanding(l) > 0)
      .reduce((s: number, l: any) => s + Number(l.emi || 0), 0);

    const rent = (state?.rentedProperties || [])
      .filter((p: any) => p.isActive !== false)
      .reduce((s: number, p: any) => s + getEffectiveRent(p), 0);

    const sipTotal = (state?.sips || [])
      .filter((s: any) => s.status !== "stopped")
      .reduce((s: number, si: any) => s + Number(si.amount || 0), 0);

    const subTotal = (state?.subscriptions || [])
      .filter((s: any) => !s.paused)
      .reduce(
        (s: number, sub: any) =>
          s + getSubscriptionMonthlyEquivalent(sub.amount, sub.cycle),
        0
      );

    const recTotal = (state?.recurringExpenses || []).reduce(
      (s: number, r: any) => s + Number(r.amount || 0),
      0
    );

    const insTotal = [
      ...(state?.lic || []),
      ...(state?.termPlans || []),
      ...(state?.investmentPlans || []),
      ...(state?.healthInsurance || []),
    ].reduce(
      (s: number, p: any) =>
        s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium) / 12,
      0
    );

    const expenseBreakdown = [
      { id: "emis", label: "Loan & Debt EMIs", amount: emis, icon: CreditCard, essential: true, category: "Debt Obligation" },
      { id: "rent", label: "Rent & Housing", amount: rent, icon: Home, essential: true, category: "Shelter" },
      { id: "recurring", label: "Utilities, Bills & Living", amount: recTotal, icon: ClipboardList, essential: true, category: "Essentials" },
      { id: "insurance", label: "Insurance Protection Premiums", amount: insTotal, icon: HeartPulse, essential: true, category: "Protection" },
      { id: "sips", label: "SIP & Wealth Investments", amount: sipTotal, icon: TrendingUp, essential: false, category: "Wealth Creation" },
      { id: "subs", label: "Digital Subscriptions & Media", amount: subTotal, icon: RefreshCw, essential: false, category: "Discretionary" },
    ].filter((e) => e.amount > 0);

    const essentialCommitmentsTotal = emis + rent + recTotal + insTotal;
    const discretionaryCommitmentsTotal = sipTotal + subTotal;
    const totalBottomUp = essentialCommitmentsTotal + discretionaryCommitmentsTotal;

    const baseStandardExpense = ef.monthlyExpense || totalBottomUp || 50000;
    
    // Survival Mode baseline: only essential commitments (or minimum 65% of standard)
    const baseSurvivalExpense = Math.max(
      essentialCommitmentsTotal > 0 ? essentialCommitmentsTotal : baseStandardExpense * 0.65,
      baseStandardExpense * 0.5
    );

    // Active Monthly Expense based on Burn Mode
    let activeExpense = burnMode === "survival" ? baseSurvivalExpense : baseStandardExpense;

    // Apply "What-If" Trimmer modifications
    let trimmedExpense = activeExpense;
    if (trimSIPs && sipTotal > 0) {
      trimmedExpense = Math.max(1000, trimmedExpense - sipTotal);
    }
    if (trimSubs && subTotal > 0) {
      trimmedExpense = Math.max(1000, trimmedExpense - subTotal);
    }
    if (discretionaryCutPct > 0) {
      const variableSpend = Math.max(0, trimmedExpense - essentialCommitmentsTotal);
      const cutAmount = variableSpend * (discretionaryCutPct / 100);
      trimmedExpense = Math.max(essentialCommitmentsTotal, trimmedExpense - cutAmount);
    }

    // Runway metrics
    const standardMonthsCovered = baseStandardExpense > 0 ? totalLiquid / baseStandardExpense : 0;
    const survivalMonthsCovered = baseSurvivalExpense > 0 ? totalLiquid / baseSurvivalExpense : 0;
    const activeMonthsCovered = trimmedExpense > 0 ? totalLiquid / trimmedExpense : 0;
    const trimmedMonthsAdded = Math.max(0, activeMonthsCovered - standardMonthsCovered);

    // Target Calculations
    const targetAmount = trimmedExpense * targetMonths;
    const gap = Math.max(0, targetAmount - totalLiquid);
    const surplus = Math.max(0, totalLiquid - targetAmount);
    const coveragePct = targetAmount > 0 ? (totalLiquid / targetAmount) * 100 : 0;

    // Liquidity Tiers
    const tier1 = bankBalance;
    const tier2 = liquidMF;
    const tier3 = fdValue + prepaidBalance;

    const tier1Pct = totalLiquid > 0 ? (tier1 / totalLiquid) * 100 : 0;
    const tier2Pct = totalLiquid > 0 ? (tier2 / totalLiquid) * 100 : 0;
    const tier3Pct = totalLiquid > 0 ? (tier3 / totalLiquid) * 100 : 0;

    return {
      bankBalance,
      fdValue,
      liquidMF,
      prepaidBalance,
      totalLiquid,
      baseStandardExpense,
      baseSurvivalExpense,
      activeExpense: trimmedExpense,
      essentialCommitmentsTotal,
      discretionaryCommitmentsTotal,
      standardMonthsCovered,
      survivalMonthsCovered,
      monthsCovered: activeMonthsCovered,
      trimmedMonthsAdded,
      targetMonths,
      targetAmount,
      gap,
      surplus,
      coveragePct,
      expenseBreakdown,
      tier1,
      tier2,
      tier3,
      tier1Pct,
      tier2Pct,
      tier3Pct,
      bankAccounts,
      liquidFunds,
      nearTermFDs,
      breakGlassFDs,
      breakGlassFDTotal,
      prepaidCards,
      sipTotal,
      subTotal,
    };
  }, [state, ef, burnMode, targetMonths, trimSIPs, trimSubs, discretionaryCutPct]);

  // Dynamic Tier Status
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
          : data.monthsCovered < 12
            ? "Fortified Safety Net"
            : "Fort Knox Protection";

  const animatedMonthsCovered = useAnimatedNumber(data.monthsCovered);

  // Household Monthly Surplus & Target Timeline
  const monthlySurplus = Math.max(0, (metrics?.monthIncome || 0) - (metrics?.monthExpense || 0));
  const activeMonthlyAllocation = customMonthlyAllocation > 0 ? customMonthlyAllocation : monthlySurplus;
  const monthsToTarget = data.gap > 0 && activeMonthlyAllocation > 0 ? data.gap / activeMonthlyAllocation : null;

  // Crisis Stress-Test Engine Computations
  const stressSimulation = useMemo(() => {
    let shockCost = 0;
    let title = "";
    let durationMonths = 0;

    if (activeShockScenario === "jobloss") {
      durationMonths = customJobLossMonths;
      shockCost = data.activeExpense * durationMonths;
      title = `${durationMonths}-Month Sudden Job Loss / Income Halt`;
    } else if (activeShockScenario === "medical") {
      shockCost = 500000;
      title = "Major Hospitalization / Medical Emergency Shock (₹5,00,000)";
    } else if (activeShockScenario === "repair") {
      shockCost = 150000;
      title = "Critical Home Structural / Vehicle Breakdown Shock (₹1,50,000)";
    } else if (activeShockScenario === "blackswan") {
      durationMonths = 6;
      shockCost = data.activeExpense * 6 + 300000;
      title = "Black Swan Crisis (6-Month Job Loss + ₹3L Medical Shock)";
    } else if (activeShockScenario === "custom") {
      shockCost = customShockAmount;
      title = `Custom Shock Scenario (${fmtINRFull(customShockAmount)})`;
    }

    const remainingLiquid = Math.max(0, data.totalLiquid - shockCost);
    const shortfall = Math.max(0, shockCost - data.totalLiquid);
    const postShockMonths = data.activeExpense > 0 ? remainingLiquid / data.activeExpense : 0;

    // Waterfall Drawdown
    let remCost = shockCost;
    const tier1Drawn = Math.min(data.tier1, remCost);
    remCost -= tier1Drawn;
    const tier2Drawn = Math.min(data.tier2, remCost);
    remCost -= tier2Drawn;
    const tier3Drawn = Math.min(data.tier3, remCost);
    remCost -= tier3Drawn;
    const deficitRequireEquity = remCost;

    return {
      shockCost,
      title,
      remainingLiquid,
      shortfall,
      postShockMonths,
      tier1Drawn,
      tier2Drawn,
      tier3Drawn,
      deficitRequireEquity,
      isFullyAbsorbed: shortfall === 0,
    };
  }, [activeShockScenario, customShockAmount, customJobLossMonths, data]);

  return (
    <div className="tab-content-enter">
      {/* Header with Title & Quick Controls */}
      <SectionTitle
        sub="Instant emergency runway, 3-tier liquidity waterfall, interactive burn lab, and stress-test simulation"
        rightElement={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Burn Mode Switcher */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                borderRadius: "var(--radius-md)",
                padding: 3,
                gap: 2,
              }}
            >
              <button
                onClick={() => setBurnMode("standard")}
                className={`demat-portfolio-pill ${burnMode === "standard" ? "active" : ""}`}
                style={{
                  fontSize: 11,
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: burnMode === "standard" ? 700 : 500,
                }}
              >
                Standard Lifestyle Burn
              </button>
              <button
                onClick={() => setBurnMode("survival")}
                className={`demat-portfolio-pill ${burnMode === "survival" ? "active" : ""}`}
                style={{
                  fontSize: 11,
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: burnMode === "survival" ? 700 : 500,
                  ...(burnMode === "survival"
                    ? { background: THEME.gold, color: "#000" }
                    : {}),
                }}
                title="Bare-Bones Survival Mode trims discretionary investments and subscriptions"
              >
                <Zap size={12} /> Bare-Bones Survival
              </button>
            </div>

            {/* Protocol Action Sheet Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPlaybookModal(true)}
              style={{
                fontSize: 11,
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FileText size={13} color={THEME.accent} /> Emergency Playbook
            </Button>
          </div>
        }
      >
        Emergency Fund & Runway Hub
      </SectionTitle>

      {/* Target Horizon Quick Selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 16px",
          background: "color-mix(in srgb, var(--surface-0) 90%, var(--t-accent) 10%)",
          border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
          borderRadius: "var(--radius-lg)",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Target size={15} color={THEME.accent} />
          <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
            Target Runway Horizon:
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: THEME.accent }}>
            {targetMonths} Months
          </span>
          <span style={{ fontSize: 11, color: THEME.muted }}>
            ({fmtINRFull(data.targetAmount)} needed)
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[3, 6, 9, 12, 18, 24].map((m) => (
            <button
              key={m}
              onClick={() => setTargetMonths(m)}
              style={{
                fontSize: 11,
                fontWeight: targetMonths === m ? 800 : 600,
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${targetMonths === m ? THEME.accent : "var(--t-line)"}`,
                background: targetMonths === m ? THEME.accent : "var(--surface-0)",
                color: targetMonths === m ? "#fff" : "var(--text-1)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {m}M {m === 6 ? "(Standard)" : m === 12 ? "(Fortified)" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Main Executive Cockpit Hero Card */}
      <Card
        variant="base"
        style={{
          marginBottom: 22,
          padding: "clamp(22px, 3.5vw, 32px)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 93%, var(--t-accent) 7%), var(--surface-0))",
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
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          {/* Radial Runway Speedometer Gauge */}
          <div
            style={{
              position: "relative",
              width: 140,
              height: 140,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
              {/* Background Track */}
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="var(--t-line)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Progress Arc */}
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke={healthColor}
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 58}
                strokeDashoffset={
                  2 * Math.PI * 58 * (1 - Math.min(data.coveragePct, 100) / 100)
                }
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
                  filter: `drop-shadow(0 0 6px color-mix(in srgb, ${healthColor} 40%, transparent))`,
                }}
              />
            </svg>

            {/* Inner Center Metrics */}
            <div
              style={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 32,
                  fontWeight: 900,
                  color: healthColor,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
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
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: data.coveragePct >= 100 ? THEME.sage : THEME.gold,
                  marginTop: 3,
                }}
              >
                {data.coveragePct.toFixed(0)}% funded
              </div>
            </div>
          </div>

          {/* Core Insights & Runway Details */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: healthColor,
                  background: `color-mix(in srgb, ${healthColor} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${healthColor} 28%, transparent)`,
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {data.monthsCovered >= targetMonths ? (
                  <ShieldCheck size={14} />
                ) : (
                  <ShieldAlert size={14} />
                )}
                {healthLabel}
              </span>

              <Badge variant={burnMode === "survival" ? "gold" : "muted"}>
                {burnMode === "survival" ? "⚡ Bare-Bones Survival Mode" : "Standard Full Burn"}
              </Badge>

              {data.trimmedMonthsAdded > 0.05 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.sage,
                    background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                    padding: "3px 8px",
                    borderRadius: "var(--radius-xs)",
                  }}
                >
                  +{data.trimmedMonthsAdded.toFixed(1)}M Gained from Trimming
                </span>
              )}
            </div>

            <div
              style={{
                fontSize: 15,
                color: THEME.ink,
                marginBottom: 12,
                lineHeight: 1.45,
              }}
            >
              Your total liquid safety net of <strong>{fmtINRFull(data.totalLiquid)}</strong> can support your household for{" "}
              <strong style={{ color: healthColor, fontSize: 16 }}>
                {data.monthsCovered.toFixed(1)} months ({Math.round(data.monthsCovered * 30.44)} days)
              </strong>{" "}
              without any incoming salary or business revenue.
              {data.gap > 0 ? (
                <span style={{ color: THEME.rust, fontWeight: 600 }}>
                  {" "}
                  You currently have an emergency shortfall of {fmtINRFull(data.gap)} to reach your {targetMonths}-month target buffer.
                </span>
              ) : (
                <span style={{ color: THEME.sage, fontWeight: 600 }}>
                  {" "}
                  Your emergency buffer is completely fortified with a surplus of {fmtINRFull(data.surplus)} over your {targetMonths}-month horizon!
                </span>
              )}
            </div>

            {/* Segmented Runway Progress Bar */}
            <div
              style={{
                height: 12,
                borderRadius: 6,
                background: "var(--t-line)",
                overflow: "hidden",
                position: "relative",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, data.coveragePct)}%`,
                  background: `linear-gradient(90deg, ${healthColor}, color-mix(in srgb, ${healthColor} 75%, white))`,
                  borderRadius: 6,
                  transition: "width 0.8s var(--ease-premium)",
                }}
              />
            </div>

            {/* Scale Markers */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: THEME.muted,
                fontWeight: 600,
              }}
            >
              <span>0M (Vulnerable)</span>
              <span>3M (Minimum)</span>
              <span style={{ fontWeight: 800, color: THEME.ink }}>
                {targetMonths}M Target ({fmtINRFull(data.targetAmount)})
              </span>
              <span>12M+ (Fort Knox)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Primary KPI Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Total Liquid Reserves"
          value={fmtINRFull(data.totalLiquid)}
          numericValue={data.totalLiquid}
          formatValue={fmtINRFull}
          sub={`T+0: ${fmtINR(data.tier1)} | T+1: ${fmtINR(data.tier2)} | T+3: ${fmtINR(data.tier3)}`}
          icon={<IndianRupee />}
          color={THEME.sage}
        />
        <StatCard
          label={burnMode === "survival" ? "Survival Burn Rate / Mo" : "Monthly Burn Rate"}
          value={fmtINRFull(data.activeExpense)}
          numericValue={data.activeExpense}
          formatValue={fmtINRFull}
          sub={
            burnMode === "survival"
              ? "Essential living, rent & EMI floor"
              : `Essential: ${fmtINR(data.essentialCommitmentsTotal)} | Disc: ${fmtINR(data.discretionaryCommitmentsTotal)}`
          }
          icon={<Wallet />}
          color={THEME.gold}
        />
        <StatCard
          label={`${targetMonths}-Month Target Buffer`}
          value={fmtINRFull(data.targetAmount)}
          numericValue={data.targetAmount}
          formatValue={fmtINRFull}
          sub={`Calculated at ${fmtINR(data.activeExpense)} / month`}
          icon={<Target />}
          color={THEME.accent}
        />
        <StatCard
          label={data.gap > 0 ? "Emergency Reserve Shortfall" : "Safety Buffer Surplus"}
          value={data.gap > 0 ? fmtINRFull(data.gap) : fmtINRFull(data.surplus)}
          numericValue={data.gap > 0 ? data.gap : data.surplus}
          formatValue={fmtINRFull}
          sub={
            data.gap > 0
              ? monthsToTarget !== null
                ? `~${Math.ceil(monthsToTarget)} months to fund with surplus`
                : "Requires monthly savings allocation"
              : "Zero emergency shortfall"
          }
          icon={data.gap > 0 ? <AlertTriangle /> : <CheckCircle2 />}
          color={data.gap > 0 ? THEME.rust : THEME.sage}
        />
      </div>

      {/* 3-Tier Liquidity Waterfall & Interactive Asset Explorer */}
      <Card style={{ marginBottom: 24, padding: "clamp(18px, 3vw, 24px)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Zap size={14} color={THEME.accent} /> 3-Tier Liquidity Waterfall Architecture
            </div>
            <div style={{ fontSize: 13, color: THEME.ink }}>
              Asset liquidity classification based on access speed, settlement time, and capital preservation.
            </div>
          </div>

          {/* Tier Filter Tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {(
              [
                { id: "all", label: "All Tiers" },
                { id: "tier1", label: "Tier 1 (T+0)" },
                { id: "tier2", label: "Tier 2 (T+1)" },
                { id: "tier3", label: "Tier 3 (T+3)" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTierTab(t.id)}
                style={{
                  fontSize: 11,
                  fontWeight: activeTierTab === t.id ? 700 : 500,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${activeTierTab === t.id ? THEME.accent : "var(--t-line)"}`,
                  background: activeTierTab === t.id ? THEME.accent : "var(--surface-0)",
                  color: activeTierTab === t.id ? "#fff" : "var(--text-1)",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Liquidity Allocation Distribution Bar */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              height: 14,
              borderRadius: 7,
              background: "var(--t-line)",
              overflow: "hidden",
              display: "flex",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: `${data.tier1Pct}%`,
                background: THEME.accent,
                transition: "width 0.6s ease",
              }}
              title={`Tier 1 (T+0): ${fmtINR(data.tier1)} (${data.tier1Pct.toFixed(0)}%)`}
            />
            <div
              style={{
                width: `${data.tier2Pct}%`,
                background: THEME.sage,
                transition: "width 0.6s ease",
              }}
              title={`Tier 2 (T+1): ${fmtINR(data.tier2)} (${data.tier2Pct.toFixed(0)}%)`}
            />
            <div
              style={{
                width: `${data.tier3Pct}%`,
                background: THEME.gold,
                transition: "width 0.6s ease",
              }}
              title={`Tier 3 (T+3): ${fmtINR(data.tier3)} (${data.tier3Pct.toFixed(0)}%)`}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: THEME.muted,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: THEME.accent }} />
              <span>
                <strong>Tier 1 Instant (T+0):</strong> {fmtINR(data.tier1)} ({data.tier1Pct.toFixed(0)}%)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: THEME.sage }} />
              <span>
                <strong>Tier 2 Liquid MFs (T+1):</strong> {fmtINR(data.tier2)} ({data.tier2Pct.toFixed(0)}%)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: THEME.gold }} />
              <span>
                <strong>Tier 3 90-Day FDs & Cards (T+3):</strong> {fmtINR(data.tier3)} ({data.tier3Pct.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>

        {/* 3 Tier Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {/* Tier 1 Card */}
          {(activeTierTab === "all" || activeTierTab === "tier1") && (
            <div
              style={{
                padding: 18,
                borderRadius: "var(--radius-lg)",
                background: `color-mix(in srgb, ${THEME.accent} 4%, var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Tier 1: T+0 Instant Access
                </span>
                <Badge variant="accent">24x7 UPI / ATM</Badge>
              </div>

              <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                <Money value={data.tier1} variant="full" />
              </div>

              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
                Savings accounts & instant cash balances. Directly accessible 24x7 without redemption wait time.
              </div>

              {/* Itemized Bank Accounts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {data.bankAccounts.length > 0 ? (
                  data.bankAccounts.map((acc: any, idx: number) => (
                    <div
                      key={acc.id || idx}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <BrandLogo name={acc.bankName || acc.accountName || "Bank"} size={20} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {acc.bankName || acc.accountName || "Savings Account"}
                          </div>
                          <div style={{ fontSize: 10, color: THEME.muted }}>
                            {acc.accountType || "Savings"} {acc.accountNumber ? `••••${String(acc.accountNumber).slice(-4)}` : ""}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                        <Money value={acc.balance} variant="full" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 12, textAlign: "center", color: THEME.muted, fontSize: 12 }}>
                    No bank accounts with positive balance.
                  </div>
                )}
              </div>

              {setTab && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab("bankaccounts")}
                  style={{ marginTop: 12, fontSize: 11, alignSelf: "flex-start", gap: 4 }}
                >
                  Manage Bank Accounts <ArrowUpRight size={12} />
                </Button>
              )}
            </div>
          )}

          {/* Tier 2 Card */}
          {(activeTierTab === "all" || activeTierTab === "tier2") && (
            <div
              style={{
                padding: 18,
                borderRadius: "var(--radius-lg)",
                background: `color-mix(in srgb, ${THEME.sage} 4%, var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.sage,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Tier 2: T+1 Liquid Funds
                </span>
                <Badge variant="sage">Next-Day Payout</Badge>
              </div>

              <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                <Money value={data.tier2} variant="full" />
              </div>

              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
                Liquid, Overnight & Money Market mutual funds. Up to ₹50k instant redemption + next business day balance.
              </div>

              {/* Itemized Liquid Funds */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {data.liquidFunds.length > 0 ? (
                  data.liquidFunds.map((fund: any, idx: number) => {
                    const val = (Number(fund.units) || 0) * (Number(fund.currentNav) || Number(fund.buyNav) || 0);
                    return (
                      <div
                        key={fund.id || idx}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "var(--radius-md)",
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <BrandLogo name={fund.name || "Mutual Fund"} size={20} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {fund.name}
                            </div>
                            <div style={{ fontSize: 10, color: THEME.muted }}>
                              {fund.category || "Liquid Fund"} • NAV: ₹{fund.currentNav || fund.buyNav || "-"}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                          <Money value={val} variant="full" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: 12, textAlign: "center", color: THEME.muted, fontSize: 12 }}>
                    No liquid or overnight mutual funds recorded.
                  </div>
                )}
              </div>

              {setTab && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab("mutualfunds")}
                  style={{ marginTop: 12, fontSize: 11, alignSelf: "flex-start", gap: 4 }}
                >
                  Explore Liquid Mutual Funds <ArrowUpRight size={12} />
                </Button>
              )}
            </div>
          )}

          {/* Tier 3 Card */}
          {(activeTierTab === "all" || activeTierTab === "tier3") && (
            <div
              style={{
                padding: 18,
                borderRadius: "var(--radius-lg)",
                background: `color-mix(in srgb, ${THEME.gold} 4%, var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.gold,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Tier 3: T+3 Near-Term Buffer
                </span>
                <Badge variant="gold">≤90 Days Maturity</Badge>
              </div>

              <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                <Money value={data.tier3} variant="full" />
              </div>

              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
                Fixed deposits maturing within 90 days and reloadable prepaid card balances.
              </div>

              {/* Itemized Near-Term FDs & Prepaids */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {data.nearTermFDs.length > 0 || data.prepaidCards.length > 0 ? (
                  <>
                    {data.nearTermFDs.map((fd: any, idx: number) => {
                      const matMs = new Date(fd.maturityDate + "T00:00:00").getTime();
                      const daysLeft = Math.max(0, Math.ceil((matMs - Date.now()) / 86400000));
                      return (
                        <div
                          key={fd.id || idx}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <BrandLogo name={fd.bankName || "Bank"} size={20} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {fd.bankName || "Fixed Deposit"}
                              </div>
                              <div style={{ fontSize: 10, color: THEME.muted }}>
                                Matures in {daysLeft} days ({fd.maturityDate}) • {fd.interestRate || "-"}% p.a.
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                            <Money value={fd.principal} variant="full" />
                          </div>
                        </div>
                      );
                    })}

                    {data.prepaidCards.map((c: any, idx: number) => (
                      <div
                        key={c.id || idx}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "var(--radius-md)",
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                          <Smartphone size={16} color={THEME.gold} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                              {c.cardName || c.bankName || "Prepaid Card"}
                            </div>
                            <div style={{ fontSize: 10, color: THEME.muted }}>
                              Wallet Card {c.last4 ? `••••${c.last4}` : ""}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                          <Money value={c.balance} variant="full" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ padding: 12, textAlign: "center", color: THEME.muted, fontSize: 12 }}>
                    No fixed deposits maturing within 90 days.
                  </div>
                )}
              </div>

              {setTab && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab("fixeddeposits")}
                  style={{ marginTop: 12, fontSize: 11, alignSelf: "flex-start", gap: 4 }}
                >
                  Manage Fixed Deposits <ArrowUpRight size={12} />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Break-Glass Secondary Reserves Notice */}
        {data.breakGlassFDTotal > 0 && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-0)",
              border: `1px dashed ${THEME.line}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Lock size={16} color={THEME.muted} />
              <div style={{ fontSize: 12, color: THEME.ink }}>
                <strong>Break-Glass Secondary Reserves:</strong> You have{" "}
                <strong>{fmtINRFull(data.breakGlassFDTotal)}</strong> across {data.breakGlassFDs.length} longer-term fixed deposits that can be prematurely liquidated in extreme emergencies (with ~0.5-1% interest penalty).
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBreakGlassDrawer(!showBreakGlassDrawer)}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              {showBreakGlassDrawer ? "Hide Secondary Reserves" : "View Secondary FDs"}
            </Button>
          </div>
        )}

        {/* Secondary Reserves Drawer */}
        {showBreakGlassDrawer && data.breakGlassFDs.length > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: "var(--radius-md)",
              background: `color-mix(in srgb, ${THEME.muted} 5%, var(--surface-0))`,
              border: `1px solid ${THEME.line}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
              Long-Term Fixed Deposits (&gt;90 Days Maturity)
            </div>
            {data.breakGlassFDs.map((fd: any, i: number) => (
              <div
                key={fd.id || i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  padding: "6px 0",
                  borderBottom: `1px solid ${THEME.line}`,
                }}
              >
                <span>
                  <strong>{fd.bankName || "FD"}</strong> (Matures: {fd.maturityDate} • {fd.interestRate}%)
                </span>
                <span style={{ fontWeight: 800 }}>{fmtINRFull(fd.principal)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Interactive "What-If" Expense Trimmer & Burn Rate Lab */}
      <Card style={{ marginBottom: 24, padding: "clamp(18px, 3vw, 24px)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <SlidersHorizontal size={14} color={THEME.accent} /> "What-If" Expense Trimmer & Burn Rate Lab
            </div>
            <div style={{ fontSize: 13, color: THEME.ink }}>
              Simulate how pausing discretionary investments and optimizing spending instantly unlocks extra months of safety runway.
            </div>
          </div>

          <div
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
              background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
              fontSize: 12,
              fontWeight: 800,
              color: THEME.sage,
            }}
          >
            Trimmed Runway: {data.monthsCovered.toFixed(1)} Months
            {data.trimmedMonthsAdded > 0.05 && ` (+${data.trimmedMonthsAdded.toFixed(1)}M)`}
          </div>
        </div>

        {/* Trimmer Controls Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* Pause SIPs Toggle */}
          <div
            onClick={() => setTrimSIPs(!trimSIPs)}
            style={{
              padding: 14,
              borderRadius: "var(--radius-md)",
              background: trimSIPs
                ? `color-mix(in srgb, ${THEME.sage} 8%, var(--surface-0))`
                : "var(--surface-0)",
              border: `1px solid ${trimSIPs ? THEME.sage : THEME.line}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <TrendingUp size={15} color={trimSIPs ? THEME.sage : THEME.muted} /> Pause SIP Investments
              </span>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: `2px solid ${trimSIPs ? THEME.sage : THEME.muted}`,
                  background: trimSIPs ? THEME.sage : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {trimSIPs && <Check size={12} color="#fff" />}
              </div>
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              {data.sipTotal > 0
                ? `Frees up ${fmtINR(data.sipTotal)}/mo of cash outflow during crisis`
                : "No active SIP commitments detected"}
            </div>
          </div>

          {/* Cancel Subscriptions Toggle */}
          <div
            onClick={() => setTrimSubs(!trimSubs)}
            style={{
              padding: 14,
              borderRadius: "var(--radius-md)",
              background: trimSubs
                ? `color-mix(in srgb, ${THEME.sage} 8%, var(--surface-0))`
                : "var(--surface-0)",
              border: `1px solid ${trimSubs ? THEME.sage : THEME.line}`,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
                <RefreshCw size={15} color={trimSubs ? THEME.sage : THEME.muted} /> Cancel Subscriptions & Media
              </span>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: `2px solid ${trimSubs ? THEME.sage : THEME.muted}`,
                  background: trimSubs ? THEME.sage : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {trimSubs && <Check size={12} color="#fff" />}
              </div>
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              {data.subTotal > 0
                ? `Frees up ${fmtINR(data.subTotal)}/mo from streaming & SaaS services`
                : "No active subscriptions detected"}
            </div>
          </div>

          {/* Discretionary Lifestyle Slider */}
          <div
            style={{
              padding: 14,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                Discretionary Spending Cut
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: THEME.accent }}>
                {discretionaryCutPct}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="75"
              step="25"
              value={discretionaryCutPct}
              onChange={(e) => setDiscretionaryCutPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent, cursor: "pointer", marginBottom: 4 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted }}>
              <span>0% (Full)</span>
              <span>25% Cut</span>
              <span>50% Cut</span>
              <span>75% (Lean)</span>
            </div>
          </div>
        </div>

        {/* Itemized Household Commitments Table */}
        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Itemized Monthly Commitments ({data.expenseBreakdown.length} Categories)
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.expenseBreakdown.map((e, idx) => {
            const isPaused = (e.id === "sips" && trimSIPs) || (e.id === "subs" && trimSubs);
            return (
              <div
                key={e.id || idx}
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  background: isPaused
                    ? `color-mix(in srgb, ${THEME.rust} 5%, var(--surface-0))`
                    : "var(--surface-0)",
                  border: `1px solid ${isPaused ? THEME.rust : THEME.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  opacity: isPaused ? 0.6 : 1,
                  textDecoration: isPaused ? "line-through" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <e.icon size={16} color={e.essential ? THEME.accent : THEME.gold} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{e.label}</span>
                    <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 8 }}>
                      ({e.category})
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Badge variant={e.essential ? "accent" : "muted"}>
                    {e.essential ? "Essential (Locked)" : "Discretionary (Pausable)"}
                  </Badge>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, minWidth: 90, textAlign: "right" }}>
                    <Money value={e.amount} variant="full" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Emergency Crisis Stress-Test Sandbox */}
      <Card style={{ marginBottom: 24, padding: "clamp(18px, 3vw, 24px)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <Flame size={14} color={THEME.rust} /> Emergency Crisis Stress-Test Sandbox
            </div>
            <div style={{ fontSize: 13, color: THEME.ink }}>
              Simulate black-swan financial shocks and inspect real-time liquidity exhaustion sequence.
            </div>
          </div>

          {activeShockScenario !== "none" && (
            <button
              onClick={() => setActiveShockScenario("none")}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: THEME.rust,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Reset Simulation
            </button>
          )}
        </div>

        {/* Scenario Selection Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { id: "jobloss", title: "Sudden Job Loss (6 Mos)", desc: `Burn: ${fmtINR(data.activeExpense * 6)}`, icon: ShieldAlert, color: THEME.rust },
            { id: "medical", title: "Medical Out-of-Pocket", desc: "Hospitalization Shock: ₹5L", icon: HeartPulse, color: THEME.pink },
            { id: "repair", title: "Major Asset Breakdown", desc: "Vehicle / Home Shock: ₹1.5L", icon: Home, color: THEME.gold },
            { id: "blackswan", title: "Dual Black Swan Shock", desc: "6M Job Loss + ₹3L Medical", icon: Flame, color: THEME.rust },
            { id: "custom", title: "Custom Shock Sandbox", desc: "User-defined shock amount", icon: Sliders, color: THEME.accent },
          ].map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveShockScenario(s.id as any)}
              style={{
                padding: 14,
                borderRadius: "var(--radius-md)",
                background: activeShockScenario === s.id
                  ? `color-mix(in srgb, ${s.color} 10%, var(--surface-0))`
                  : "var(--surface-0)",
                border: `1px solid ${activeShockScenario === s.id ? s.color : THEME.line}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <s.icon size={16} color={s.color} />
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{s.title}</div>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Custom Controls for Shock Simulator */}
        {activeShockScenario === "custom" && (
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                Custom Out-of-Pocket Shock Amount
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.accent }}>
                {fmtINRFull(customShockAmount)}
              </span>
            </div>
            <input
              type="range"
              min="50000"
              max="2000000"
              step="50000"
              value={customShockAmount}
              onChange={(e) => setCustomShockAmount(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent, cursor: "pointer", marginBottom: 6 }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[100000, 250000, 500000, 1000000, 1500000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCustomShockAmount(amt)}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: `1px solid var(--t-line)`,
                    background: customShockAmount === amt ? THEME.accent : "var(--surface-0)",
                    color: customShockAmount === amt ? "#fff" : "var(--text-1)",
                    cursor: "pointer",
                  }}
                >
                  {fmtINR(amt)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Shock Scenario Results Card */}
        {activeShockScenario !== "none" && (
          <div
            style={{
              padding: 18,
              borderRadius: "var(--radius-lg)",
              background: stressSimulation.isFullyAbsorbed
                ? `color-mix(in srgb, ${THEME.sage} 6%, var(--surface-0))`
                : `color-mix(in srgb, ${THEME.rust} 6%, var(--surface-0))`,
              border: `1px solid ${stressSimulation.isFullyAbsorbed ? THEME.sage : THEME.rust}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
                {stressSimulation.isFullyAbsorbed ? (
                  <ShieldCheck size={18} color={THEME.sage} />
                ) : (
                  <ShieldAlert size={18} color={THEME.rust} />
                )}
                {stressSimulation.title}
              </div>
              <Badge variant={stressSimulation.isFullyAbsorbed ? "sage" : "rust"}>
                {stressSimulation.isFullyAbsorbed ? "Shock Fully Absorbed" : "Liquidity Shortfall Detected"}
              </Badge>
            </div>

            <div style={{ fontSize: 13, color: THEME.ink, marginBottom: 14 }}>
              Total Crisis Impact: <strong>{fmtINRFull(stressSimulation.shockCost)}</strong> | Liquid Remaining After Shock:{" "}
              <strong>{fmtINRFull(stressSimulation.remainingLiquid)}</strong> | Post-Shock Runway:{" "}
              <strong style={{ color: stressSimulation.postShockMonths >= 3 ? THEME.sage : THEME.rust }}>
                {stressSimulation.postShockMonths.toFixed(1)} Months
              </strong>
            </div>

            {/* Waterfall Drawdown Order */}
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 8, textTransform: "uppercase" }}>
              Crisis Liquidity Drawdown Sequence (Priority Order)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div style={{ padding: 10, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                <div style={{ fontSize: 10, color: THEME.accent, fontWeight: 800 }}>1. Tier 1 (T+0 Cash)</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  {fmtINRFull(stressSimulation.tier1Drawn)} drawn
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>
                  {fmtINR(Math.max(0, data.tier1 - stressSimulation.tier1Drawn))} left
                </div>
              </div>

              <div style={{ padding: 10, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                <div style={{ fontSize: 10, color: THEME.sage, fontWeight: 800 }}>2. Tier 2 (T+1 Liquid MFs)</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  {fmtINRFull(stressSimulation.tier2Drawn)} drawn
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>
                  {fmtINR(Math.max(0, data.tier2 - stressSimulation.tier2Drawn))} left
                </div>
              </div>

              <div style={{ padding: 10, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                <div style={{ fontSize: 10, color: THEME.gold, fontWeight: 800 }}>3. Tier 3 (T+3 Near FDs)</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  {fmtINRFull(stressSimulation.tier3Drawn)} drawn
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>
                  {fmtINR(Math.max(0, data.tier3 - stressSimulation.tier3Drawn))} left
                </div>
              </div>

              {stressSimulation.deficitRequireEquity > 0 && (
                <div style={{ padding: 10, borderRadius: "var(--radius-md)", background: `color-mix(in srgb, ${THEME.rust} 10%, var(--surface-0))`, border: `1px solid ${THEME.rust}` }}>
                  <div style={{ fontSize: 10, color: THEME.rust, fontWeight: 800 }}>4. Long-Term Equities / FDs</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>
                    {fmtINRFull(stressSimulation.deficitRequireEquity)} shortfall
                  </div>
                  <div style={{ fontSize: 10, color: THEME.rust }}>Requires selling investments</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Action Plan & Replenishment Navigator */}
      {data.gap > 0 && (
        <Card style={{ padding: "clamp(18px, 3vw, 24px)", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: THEME.muted,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TrendingUp size={14} color={THEME.sage} /> Replenishment & Gap Closure Roadmap
          </div>

          <div style={{ fontSize: 13, color: THEME.ink, marginBottom: 16 }}>
            To eliminate your remaining emergency shortfall of <strong>{fmtINRFull(data.gap)}</strong> and reach your full{" "}
            <strong>{targetMonths}-month safety buffer</strong>:
          </div>

          {/* Target Pacing Options */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
            <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Fast Track (3 Months)</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: THEME.accent }}>{fmtINR(data.gap / 3)}/mo</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>Aggressive front-loaded buffer</div>
            </div>

            <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Steady Pace (6 Months)</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: THEME.sage }}>{fmtINR(data.gap / 6)}/mo</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>Recommended balanced roadmap</div>
            </div>

            <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Gradual (12 Months)</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: THEME.gold }}>{fmtINR(data.gap / 12)}/mo</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>Low monthly burden</div>
            </div>
          </div>

          {/* Interactive Monthly Savings Slider */}
          <div
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
              background: `color-mix(in srgb, ${THEME.sage} 6%, var(--surface-0))`,
              border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                Simulate Monthly Surplus Allocation
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.sage }}>
                {fmtINRFull(activeMonthlyAllocation)}/mo
              </span>
            </div>

            <input
              type="range"
              min={Math.max(5000, Math.round(data.gap / 24))}
              max={Math.max(50000, Math.round(data.gap / 2), monthlySurplus * 1.5)}
              step="5000"
              value={activeMonthlyAllocation}
              onChange={(e) => setCustomMonthlyAllocation(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.sage, cursor: "pointer", marginBottom: 8 }}
            />

            {monthsToTarget !== null && (
              <div style={{ fontSize: 13, color: THEME.ink }}>
                At <strong>{fmtINRFull(activeMonthlyAllocation)}/mo</strong>, your emergency reserve will be 100% funded in{" "}
                <strong style={{ color: THEME.sage }}>{Math.ceil(monthsToTarget)} months</strong> (by{" "}
                <strong>
                  {new Date(Date.now() + Math.ceil(monthsToTarget) * 30.44 * 86400000).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                ).
              </div>
            )}
          </div>

          {/* Recommended Parking Allocation */}
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 8, textTransform: "uppercase" }}>
            Recommended Liquid Parking Strategy
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.accent }}>50% in Liquid MFs / Sweeps</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                High post-tax yields (~6.5-7.2% p.a.) with instant redemption access.
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.sage }}>30% in High-Yield Savings</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Instant UPI/Debit card availability for immediate hospital or auto emergencies.
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.gold }}>20% in Auto-Sweep FDs</div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Guaranteed deposit insurance (DICGC up to ₹5L per bank) with sweep facility.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Emergency Protocol Playbook Modal */}
      {showPlaybookModal && (
        <Modal
          title="Emergency Action Protocol & Family Playbook"
          onClose={() => setShowPlaybookModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
              Standard operating procedure in the event of job loss, sudden medical crisis, or catastrophic household emergency. Share this with trusted family nominees.
            </div>

            {/* Protocol Step 1 */}
            <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent, marginBottom: 4 }}>
                Phase 1: Immediate Cash (Day 0 - Hour 1)
              </div>
              <div style={{ fontSize: 12, color: THEME.ink, lineHeight: 1.4 }}>
                • Access Tier 1 Bank Accounts (Total available: <strong>{fmtINRFull(data.tier1)}</strong>) via UPI, Debit Card, or ATM.
                <br />• Instant limits: UPI up to ₹1,00,000/day, ATM cash withdrawal up to daily card limit.
              </div>
            </div>

            {/* Protocol Step 2 */}
            <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.gold, marginBottom: 4 }}>
                Phase 2: Immediate Expense Freeze (Day 0 - Day 2)
              </div>
              <div style={{ fontSize: 12, color: THEME.ink, lineHeight: 1.4 }}>
                • Log into Mutual Fund apps and <strong>pause all SIPs</strong> (frees up {fmtINR(data.sipTotal)}/mo).
                <br />• Cancel non-essential OTT / streaming subscriptions (frees up {fmtINR(data.subTotal)}/mo).
                <br />• Switch living burn to <strong>Bare-Bones Survival Mode</strong> ({fmtINR(data.baseSurvivalExpense)}/mo).
              </div>
            </div>

            {/* Protocol Step 3 */}
            <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage, marginBottom: 4 }}>
                Phase 3: Liquid Mutual Fund Redemption (Day 1)
              </div>
              <div style={{ fontSize: 12, color: THEME.ink, lineHeight: 1.4 }}>
                • Tap Liquid Mutual Funds (Total available: <strong>{fmtINRFull(data.tier2)}</strong>).
                <br />• Use Instacash feature for up to ₹50,000 credited within 30 minutes.
                <br />• Redeem remaining balance for T+1 credit directly into primary savings account by next morning.
              </div>
            </div>

            {/* Protocol Step 4 */}
            <div style={{ padding: 14, borderRadius: "var(--radius-md)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.rust, marginBottom: 4 }}>
                Phase 4: Break-Glass FD Liquidation (Last Resort)
              </div>
              <div style={{ fontSize: 12, color: THEME.ink, lineHeight: 1.4 }}>
                • Prematurely liquidate 90-day maturing fixed deposits (Total: <strong>{fmtINRFull(data.tier3)}</strong>).
                <br />• Break shortest maturity / lowest interest rate deposits first to minimize penalty.
                <br />• Avoid liquidating long-term equities or retirement EPF/PPF funds unless absolutely required.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <Button
                variant="outline"
                onClick={() => {
                  window.print();
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Printer size={14} /> Print Protocol Sheet
              </Button>
              <Button variant="primary" onClick={() => setShowPlaybookModal(false)}>
                Got It
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
