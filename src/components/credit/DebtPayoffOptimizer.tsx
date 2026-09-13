/* eslint-disable */
import React, { useState, useMemo, useCallback } from "react";
import {
  TrendingDown,
  Wallet,
  Calendar,
  Calculator,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
  Lightbulb,
  Target,
  RefreshCw,
  Sliders,
  DollarSign,
  PieChart as PieIcon,
  ShieldCheck,
  Building,
  CreditCard,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact, loanOutstanding } from "../../utils/finance";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Money } from "../ui/Money";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { BankLogo } from "../ui/BrandLogos";

const DEBT_SIM_MAX_MONTHS = 600;
const CC_MIN_DUE_RATE = 0.05;
const CC_MIN_DUE_FLOOR = 500;
const CC_DEFAULT_APR = 36;

export interface NormalizedDebt {
  id: string;
  rawId: string;
  lender: string;
  type: string;
  outstanding: number;
  emi: number;
  rate: number;
  monthsRemaining: number;
  principal: number;
  isCard: boolean;
  emiIsEstimate: boolean;
}

export interface SimResult {
  months: number;
  totalInterestPaid: number;
  payoffSchedule: Record<string, number>;
  interestPaidPerLoan: Record<string, number>;
  rollOvers: Record<string, number>;
  monthlyBalances: {
    month: number;
    monthLabel: string;
    totalBalance: number;
    interestPaidAcc: number;
  }[];
}

export interface DebtPayoffOptimizerProps {
  state: any;
}

export function DebtPayoffOptimizer({ state }: DebtPayoffOptimizerProps) {
  // Simulation inputs
  const [extraMonthly, setExtraMonthly] = useState<number>(10000);
  const [windfall, setWindfall] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<"avalanche" | "snowball" | "cashflow">("avalanche");
  const [includeCC, setIncludeCC] = useState<boolean>(true);
  const [excludedDebtIds, setExcludedDebtIds] = useState<Record<string, boolean>>({});

  // Feature modals & views
  const [activeViewTab, setActiveViewTab] = useState<"timeline" | "chart" | "breakdown">("timeline");
  const [showGoalSolverModal, setShowGoalSolverModal] = useState<boolean>(false);
  const [showConsolidationModal, setShowConsolidationModal] = useState<boolean>(false);
  const [showManageDebtsModal, setShowManageDebtsModal] = useState<boolean>(false);

  // Goal Solver State
  const [targetDebtFreeMonths, setTargetDebtFreeMonths] = useState<number>(24);

  // Consolidation Refinance Modeler State
  const [consolidationRate, setConsolidationRate] = useState<number>(10.5);
  const [consolidationTenureMonths, setConsolidationTenureMonths] = useState<number>(36);
  const [selectedForConsolidation, setSelectedForConsolidation] = useState<Record<string, boolean>>({});

  // 1. Term Loans Normalization
  const normalizedLoans = useMemo<NormalizedDebt[]>(() => {
    return (state.loansTaken || [])
      .map((l: any) => {
        const outstanding = loanOutstanding(l);
        return {
          id: `loan-${l.id}`,
          rawId: String(l.id),
          lender: l.lender || "Loan",
          type: l.type || "Personal Loan",
          outstanding,
          emi: Number(l.emi) || 0,
          rate: l.rate != null && l.rate !== "" ? Number(l.rate) : 8.5,
          monthsRemaining: Number(l.monthsRemaining) || 0,
          principal: Number(l.principal) || outstanding,
          isCard: false,
          emiIsEstimate: false,
        };
      })
      .filter((l: NormalizedDebt) => l.outstanding > 0 && l.emi > 0);
  }, [state.loansTaken]);

  // 2. Credit Cards Normalization
  const normalizedCards = useMemo<NormalizedDebt[]>(() => {
    if (!includeCC) return [];
    return (state.creditCards || [])
      .filter((c: any) => (c.status || "active").toLowerCase() !== "closed")
      .map((c: any) => {
        const outstanding = Number(c.outstanding) || 0;
        const rate =
          c.interestRate != null && c.interestRate !== "" ? Number(c.interestRate) : CC_DEFAULT_APR;
        const minDue = Math.min(outstanding, Math.max(outstanding * CC_MIN_DUE_RATE, CC_MIN_DUE_FLOOR));
        return {
          id: `cc-${c.id}`,
          rawId: String(c.id),
          lender: c.issuer || "Credit Card",
          type: "Credit Card",
          outstanding,
          emi: Math.round(minDue),
          rate,
          monthsRemaining: 0,
          principal: outstanding,
          isCard: true,
          emiIsEstimate: true,
        };
      })
      .filter((c: NormalizedDebt) => c.outstanding > 0);
  }, [state.creditCards, includeCC]);

  // All Available Active Debts
  const allAvailableDebts = useMemo<NormalizedDebt[]>(() => {
    return [...normalizedLoans, ...normalizedCards];
  }, [normalizedLoans, normalizedCards]);

  // Filtered Active Loans based on user's manual selection
  const activeLoans = useMemo<NormalizedDebt[]>(() => {
    return allAvailableDebts.filter((d) => !excludedDebtIds[d.id]);
  }, [allAvailableDebts, excludedDebtIds]);

  const hasAnyRawDebt =
    (state.loansTaken || []).some((l: any) => loanOutstanding(l) > 0) ||
    (state.creditCards || []).some(
      (c: any) => (c.status || "active").toLowerCase() !== "closed" && Number(c.outstanding) > 0
    );

  const excludedZeroEmiLoans = useMemo(() => {
    return (state.loansTaken || []).filter(
      (l: any) => loanOutstanding(l) > 0 && Number(l.emi || 0) <= 0
    );
  }, [state.loansTaken]);

  // Helper date formatter
  const getPayoffDateStr = useCallback((monthsFromNow: number) => {
    if (monthsFromNow === 0) return "Paid Today";
    if (monthsFromNow >= DEBT_SIM_MAX_MONTHS) return "Beyond 50y";
    const date = new Date();
    date.setMonth(date.getMonth() + monthsFromNow);
    return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }, []);

  // 3. Robust Payoff Simulator Engine
  const simulateDebtPayoff = useCallback(
    (
      loans: NormalizedDebt[],
      extra: number,
      strategy: "standard" | "snowball" | "avalanche" | "cashflow",
      windfallAmt: number
    ): SimResult => {
      let active = loans.map((l) => ({ ...l })).filter((l) => l.outstanding > 0);

      if (active.length === 0) {
        return {
          months: 0,
          totalInterestPaid: 0,
          payoffSchedule: {},
          interestPaidPerLoan: {},
          rollOvers: {},
          monthlyBalances: [{ month: 0, monthLabel: "Start", totalBalance: 0, interestPaidAcc: 0 }],
        };
      }

      // Pre-sort by strategy
      if (strategy === "snowball") {
        active.sort((a, b) => a.outstanding - b.outstanding);
      } else if (strategy === "avalanche") {
        active.sort((a, b) => b.rate - a.rate);
      } else if (strategy === "cashflow") {
        active.sort((a, b) => b.emi - a.emi);
      }

      let months = 0;
      let totalInterestPaid = 0;
      const payoffSchedule: Record<string, number> = {};
      const interestPaidPerLoan: Record<string, number> = {};
      const rollOvers: Record<string, number> = {};
      const monthlyBalances: SimResult["monthlyBalances"] = [];

      // Record initial state
      const initialTotal = active.reduce((s, l) => s + l.outstanding, 0);
      monthlyBalances.push({
        month: 0,
        monthLabel: "Today",
        totalBalance: Math.round(initialTotal),
        interestPaidAcc: 0,
      });

      // Apply initial windfall paydown
      if (windfallAmt > 0) {
        let remainingWindfall = windfallAmt;
        for (let l of active) {
          if (remainingWindfall <= 0) break;
          const pay = Math.min(l.outstanding, remainingWindfall);
          l.outstanding -= pay;
          remainingWindfall -= pay;
          if (l.outstanding <= 0 && !payoffSchedule[l.id]) {
            payoffSchedule[l.id] = 0;
          }
        }
      }

      // Month-by-month simulation loop
      while (active.some((l) => l.outstanding > 0) && months < DEBT_SIM_MAX_MONTHS) {
        months++;

        // Accrue interest monthly
        for (const l of active) {
          if (l.outstanding > 0) {
            const r = l.rate / 100 / 12;
            const interest = l.outstanding * r;
            totalInterestPaid += interest;
            interestPaidPerLoan[l.id] = (interestPaidPerLoan[l.id] || 0) + interest;
            l.outstanding += interest;
          }
        }

        // Sum up EMIs that are currently active
        const totalBudget = active.reduce((sum, l) => sum + l.emi, 0) + extra;
        let actualBasePaid = 0;

        // Step 1: Pay standard base EMIs
        for (const l of active) {
          if (l.outstanding > 0) {
            const basePay = Math.min(l.outstanding, l.emi);
            l.outstanding -= basePay;
            actualBasePaid += basePay;

            if (l.outstanding <= 0 && !payoffSchedule[l.id]) {
              payoffSchedule[l.id] = months;
            }
          }
        }

        // Step 2: Allocate surplus roll-overs to active targets in sorted-priority order
        if (strategy !== "standard") {
          let surplus = totalBudget - actualBasePaid;
          for (const target of active) {
            if (surplus <= 0) break;
            if (target.outstanding <= 0) continue;
            const extraPay = Math.min(target.outstanding, surplus);
            rollOvers[target.id] = (rollOvers[target.id] || 0) + extraPay;
            target.outstanding -= extraPay;
            surplus -= extraPay;

            if (target.outstanding <= 0 && !payoffSchedule[target.id]) {
              payoffSchedule[target.id] = months;
            }
          }
        }

        // Sample balance points for charts
        const currentRemBalance = active.reduce((s, l) => s + Math.max(0, l.outstanding), 0);
        if (months <= 36 || months % 3 === 0 || currentRemBalance === 0) {
          monthlyBalances.push({
            month: months,
            monthLabel: getPayoffDateStr(months),
            totalBalance: Math.round(currentRemBalance),
            interestPaidAcc: Math.round(totalInterestPaid),
          });
        }
      }

      return {
        months,
        totalInterestPaid,
        payoffSchedule,
        interestPaidPerLoan,
        rollOvers,
        monthlyBalances,
      };
    },
    [getPayoffDateStr]
  );

  // Strategy Simulations
  const standardSim = useMemo(
    () => simulateDebtPayoff(activeLoans, 0, "standard", 0),
    [activeLoans, simulateDebtPayoff]
  );

  const snowballSim = useMemo(
    () => simulateDebtPayoff(activeLoans, extraMonthly, "snowball", Number(windfall) || 0),
    [activeLoans, extraMonthly, windfall, simulateDebtPayoff]
  );

  const avalancheSim = useMemo(
    () => simulateDebtPayoff(activeLoans, extraMonthly, "avalanche", Number(windfall) || 0),
    [activeLoans, extraMonthly, windfall, simulateDebtPayoff]
  );

  const cashflowSim = useMemo(
    () => simulateDebtPayoff(activeLoans, extraMonthly, "cashflow", Number(windfall) || 0),
    [activeLoans, extraMonthly, windfall, simulateDebtPayoff]
  );

  const currentSim = useMemo(() => {
    if (selectedPlan === "snowball") return snowballSim;
    if (selectedPlan === "cashflow") return cashflowSim;
    return avalancheSim;
  }, [selectedPlan, snowballSim, cashflowSim, avalancheSim]);

  // Aggregate stats
  const totalOutstandingDebt = useMemo(
    () => activeLoans.reduce((s, l) => s + l.outstanding, 0),
    [activeLoans]
  );

  const totalMonthlyCommitment = useMemo(
    () => activeLoans.reduce((s, l) => s + l.emi, 0),
    [activeLoans]
  );

  const blendedRate = useMemo(() => {
    if (totalOutstandingDebt <= 0) return 0;
    return activeLoans.reduce((s, l) => s + l.rate * l.outstanding, 0) / totalOutstandingDebt;
  }, [activeLoans, totalOutstandingDebt]);

  const standardInterest = standardSim.totalInterestPaid;
  const currentInterest = currentSim.totalInterestPaid;
  const interestSaved = Math.max(0, standardInterest - currentInterest);
  const monthsSaved = Math.max(0, standardSim.months - currentSim.months);

  // Strategy Comparisons
  const cheaperPlan =
    avalancheSim.totalInterestPaid <= snowballSim.totalInterestPaid ? "Avalanche" : "Snowball";
  const interestDiffVsOtherPlan = Math.abs(
    snowballSim.totalInterestPaid - avalancheSim.totalInterestPaid
  );
  const monthsDiffVsOtherPlan = snowballSim.months - avalancheSim.months;

  const currentSimCapped =
    currentSim.months >= DEBT_SIM_MAX_MONTHS &&
    activeLoans.some((l) => currentSim.payoffSchedule[l.id] == null);

  const standardCapped =
    standardSim.months >= DEBT_SIM_MAX_MONTHS &&
    activeLoans.some((l) => standardSim.payoffSchedule[l.id] == null);

  // Chronological Timeline Rows
  const timelineRows = useMemo(() => {
    return activeLoans
      .map((l) => {
        const targetPayoffMonth =
          currentSim.payoffSchedule[l.id] != null ? currentSim.payoffSchedule[l.id] : currentSim.months;
        const standardPayoffMonth =
          standardSim.payoffSchedule[l.id] != null
            ? standardSim.payoffSchedule[l.id]
            : standardSim.months || Number(l.monthsRemaining) || 0;
        const monthsSavedOnLoan =
          targetPayoffMonth >= DEBT_SIM_MAX_MONTHS
            ? 0
            : Math.max(0, standardPayoffMonth - targetPayoffMonth);
        const rolledOver = currentSim.rollOvers?.[l.id] || 0;
        const interestPaid = currentSim.interestPaidPerLoan?.[l.id] || 0;
        const standardInterestPaid = standardSim.interestPaidPerLoan?.[l.id] || 0;
        const interestSavedOnLoan = Math.max(0, standardInterestPaid - interestPaid);

        return {
          ...l,
          targetPayoffMonth,
          standardPayoffMonth,
          monthsSavedOnLoan,
          rolledOver,
          interestPaid,
          interestSavedOnLoan,
        };
      })
      .sort((a, b) => a.targetPayoffMonth - b.targetPayoffMonth);
  }, [activeLoans, currentSim, standardSim]);

  // Paydown Trajectory Chart Dataset
  const trajectoryChartData = useMemo(() => {
    if (activeLoans.length === 0) return [];
    const maxMonths = Math.min(
      DEBT_SIM_MAX_MONTHS,
      Math.max(standardSim.months, currentSim.months, 12)
    );

    const step = maxMonths > 120 ? 6 : maxMonths > 48 ? 3 : 1;
    const dataPoints: {
      month: number;
      dateLabel: string;
      Standard: number;
      Avalanche: number;
      Snowball: number;
      Selected: number;
    }[] = [];

    // Helper interpolator from monthlyBalances
    const getBalanceAtMonth = (balances: SimResult["monthlyBalances"], m: number) => {
      if (m === 0) return balances[0]?.totalBalance || 0;
      const exact = balances.find((b) => b.month === m);
      if (exact) return exact.totalBalance;
      // find nearest prior
      let prior = balances[0];
      for (const b of balances) {
        if (b.month <= m) prior = b;
        else break;
      }
      return prior ? prior.totalBalance : 0;
    };

    for (let m = 0; m <= maxMonths; m += step) {
      dataPoints.push({
        month: m,
        dateLabel: m === 0 ? "Today" : getPayoffDateStr(m),
        Standard: getBalanceAtMonth(standardSim.monthlyBalances, m),
        Avalanche: getBalanceAtMonth(avalancheSim.monthlyBalances, m),
        Snowball: getBalanceAtMonth(snowballSim.monthlyBalances, m),
        Selected: getBalanceAtMonth(currentSim.monthlyBalances, m),
      });
      if (
        getBalanceAtMonth(standardSim.monthlyBalances, m) === 0 &&
        getBalanceAtMonth(currentSim.monthlyBalances, m) === 0
      ) {
        break;
      }
    }

    return dataPoints;
  }, [activeLoans, standardSim, avalancheSim, snowballSim, currentSim, getPayoffDateStr]);

  // Goal-based Reverse Solver (Find required monthly surplus for target debt-free month)
  const requiredSurplusForTargetDate = useMemo(() => {
    if (targetDebtFreeMonths <= 0 || activeLoans.length === 0) return 0;
    // Binary search for exact extraMonthly needed
    let low = 0;
    let high = 500000;
    let best = high;

    for (let iter = 0; iter < 30; iter++) {
      const mid = Math.round((low + high) / 2 / 100) * 100;
      const sim = simulateDebtPayoff(activeLoans, mid, selectedPlan, Number(windfall) || 0);
      if (sim.months <= targetDebtFreeMonths) {
        best = mid;
        high = mid - 100;
      } else {
        low = mid + 100;
      }
    }
    return Math.max(0, best);
  }, [targetDebtFreeMonths, activeLoans, selectedPlan, windfall, simulateDebtPayoff]);

  // Consolidation Refinance Calculator
  const consolidationAnalysis = useMemo(() => {
    const selectedList = activeLoans.filter((d) => selectedForConsolidation[d.id]);
    const totalConsolidatedPrincipal = selectedList.reduce((s, d) => s + d.outstanding, 0);
    const existingTotalEmi = selectedList.reduce((s, d) => s + d.emi, 0);
    const existingWeightedRate =
      totalConsolidatedPrincipal > 0
        ? selectedList.reduce((s, d) => s + d.rate * d.outstanding, 0) / totalConsolidatedPrincipal
        : 0;

    // Standard EMI formula: E = P * r * (1+r)^n / ((1+r)^n - 1)
    const monthlyRate = consolidationRate / 100 / 12;
    const n = consolidationTenureMonths;
    let newConsolidatedEmi = 0;
    let newTotalInterest = 0;

    if (totalConsolidatedPrincipal > 0 && n > 0) {
      if (monthlyRate > 0) {
        const factor = Math.pow(1 + monthlyRate, n);
        newConsolidatedEmi = (totalConsolidatedPrincipal * monthlyRate * factor) / (factor - 1);
        newTotalInterest = newConsolidatedEmi * n - totalConsolidatedPrincipal;
      } else {
        newConsolidatedEmi = totalConsolidatedPrincipal / n;
        newTotalInterest = 0;
      }
    }

    // Existing interest estimate (approx based on standard payoff of selected debts)
    const existingSim = simulateDebtPayoff(selectedList, 0, "standard", 0);
    const existingTotalInterest = existingSim.totalInterestPaid;
    const netInterestSaved = Math.max(0, existingTotalInterest - newTotalInterest);
    const monthlyCashFlowSavings = existingTotalEmi - newConsolidatedEmi;

    return {
      selectedCount: selectedList.length,
      totalConsolidatedPrincipal,
      existingTotalEmi,
      existingWeightedRate,
      newConsolidatedEmi,
      newTotalInterest,
      existingTotalInterest,
      netInterestSaved,
      monthlyCashFlowSavings,
    };
  }, [
    activeLoans,
    selectedForConsolidation,
    consolidationRate,
    consolidationTenureMonths,
    simulateDebtPayoff,
  ]);

  // Export Amortization Schedule to CSV
  const exportScheduleCsv = () => {
    const header =
      "Lender,Type,Interest Rate (%),Outstanding Balance (₹),Current Payment (₹),Payment Type,Projected Payoff Date,Months Saved vs Standard,Total Interest Under Plan (₹),Interest Saved (₹),Rollover Boost (₹)";
    const rows = timelineRows.map(
      (r: any) =>
        `"${(r.lender || "").replace(/"/g, '""')}","${r.type}",${r.rate.toFixed(2)},${r.outstanding.toFixed(0)},${r.emi.toFixed(0)},"${r.emiIsEstimate ? "Est. Min Due" : "Fixed EMI"}","${getPayoffDateStr(r.targetPayoffMonth)}",${r.monthsSavedOnLoan},${r.interestPaid.toFixed(0)},${r.interestSavedOnLoan.toFixed(0)},${r.rolledOver.toFixed(0)}`
    );
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debt_payoff_schedule_${selectedPlan}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4. Empty State Handlers
  if (!hasAnyRawDebt) {
    return (
      <Card style={{ padding: "56px 32px", textAlign: "center", borderRadius: "var(--radius-xl)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
            margin: "0 auto 20px",
            color: THEME.sage,
          }}
        >
          <Sparkles size={36} strokeWidth={1.8} />
        </div>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: THEME.ink,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          Zero Outstanding Liabilities Detected
        </h3>
        <p
          style={{
            fontSize: 13.5,
            color: THEME.muted,
            maxWidth: 440,
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          You have no active loans or credit card balances on file. Add your home, vehicle, personal
          bank loans under <b>Loans Taken</b> or track active balances under <b>Credit Cards</b> to
          activate the AI Payoff Optimizer!
        </p>
      </Card>
    );
  }

  if (activeLoans.length === 0) {
    return (
      <Card style={{ padding: "48px 32px", textAlign: "center", borderRadius: "var(--radius-xl)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
            margin: "0 auto 20px",
            color: THEME.accent,
          }}
        >
          <CreditCard size={32} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
          All Active Debts Currently Excluded
        </h3>
        <p
          style={{
            fontSize: 13.5,
            color: THEME.muted,
            maxWidth: 420,
            margin: "0 auto 20px",
            lineHeight: 1.6,
          }}
        >
          You have credit card or loan balances recorded, but they have been toggled off in the
          filter. Enable them to simulate payoff acceleration.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <Button
            variant="accent"
            onClick={() => {
              setIncludeCC(true);
              setExcludedDebtIds({});
            }}
          >
            Reset Filters & Include All Debts
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* ── TOP HERO COMMAND BAR ── */}
      <div
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 90%, var(--t-accent) 10%), var(--surface-0))",
          borderRadius: "var(--radius-xl)",
          border: `1px solid ${THEME.line}`,
          borderLeft: `5px solid ${THEME.accent}`,
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 4px 20px -8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: THEME.accent,
                background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              Debt Acceleration Command
            </span>
            {excludedDebtIds && Object.keys(excludedDebtIds).filter((k) => excludedDebtIds[k]).length > 0 && (
              <Badge variant="gold" style={{ fontSize: 10 }}>
                {Object.keys(excludedDebtIds).filter((k) => excludedDebtIds[k]).length} Debts Excluded
              </Badge>
            )}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 900,
              color: THEME.ink,
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Payoff Optimizer & Acceleration Studio
          </h2>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: 12.5,
              color: THEME.muted,
              fontWeight: 500,
            }}
          >
            Simulate accelerated debt elimination via mathematical Avalanche, Snowball momentum, and
            windfall injections.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Target size={14} />}
            onClick={() => setShowGoalSolverModal(true)}
            title="Calculate required extra payment to be debt-free by a specific date"
          >
            Target Date Solver
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => setShowConsolidationModal(true)}
            title="Simulate consolidating multiple high-interest debts into a single lower-rate loan"
          >
            Refinance / Consolidate
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Sliders size={14} />}
            onClick={() => setShowManageDebtsModal(true)}
            title="Selectively include or exclude individual loans and credit cards"
          >
            Manage Debts ({activeLoans.length})
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={exportScheduleCsv}
            title="Download full monthly debt payoff schedule as CSV"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── TOTAL DEBT SNAPSHOT METRICS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Total Aggregated Debt"
          value={fmtINRExact(totalOutstandingDebt)}
          numericValue={totalOutstandingDebt}
          formatValue={fmtINRExact}
          sub={`${activeLoans.length} activ${activeLoans.length === 1 ? "e liability" : "e liabilities"}`}
          icon={<Wallet />}
          color={THEME.rust}
        />
        <StatCard
          label="Monthly Base Commitment"
          value={fmtINRExact(totalMonthlyCommitment)}
          numericValue={totalMonthlyCommitment}
          formatValue={fmtINRExact}
          sub={`+₹${(extraMonthly || 0).toLocaleString("en-IN")} extra surplus`}
          icon={<Calendar />}
          color={THEME.gold}
        />
        <StatCard
          label="Blended Interest Rate"
          value={`${blendedRate.toFixed(2)}%`}
          numericValue={blendedRate}
          formatValue={(n) => `${n.toFixed(2)}%`}
          sub="Weighted portfolio APR"
          icon={<Calculator />}
          color={THEME.accent}
        />
        <StatCard
          label="Debt-Free Freedom Date"
          value={getPayoffDateStr(currentSim.months)}
          sub={
            monthsSaved > 0
              ? `Shaved ${monthsSaved} mo${monthsSaved !== 1 ? "s" : ""} (${(monthsSaved / 12).toFixed(1)} yrs)`
              : "Standard timeline"
          }
          icon={<Sparkles />}
          color={THEME.sage}
        />
      </div>

      {/* ── INTERACTIVE SIMULATION & STRATEGY CONTROLS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
          gap: 20,
        }}
      >
        {/* Left: Input Console */}
        <Card style={{ padding: 24, borderRadius: "var(--radius-xl)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Zap size={14} color={THEME.accent} /> Surplus & Prepayment Simulator
            </div>
            {(state.creditCards || []).some(
              (c: any) =>
                (c.status || "active").toLowerCase() !== "closed" && Number(c.outstanding) > 0
            ) && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: THEME.ink,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={includeCC}
                  onChange={(e) => setIncludeCC(e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: THEME.accent }}
                />
                Include Credit Cards
              </label>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Extra Monthly Repayment */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 12,
                }}
              >
                <label
                  htmlFor="extra-repayment-input"
                  style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}
                >
                  Extra Monthly Prepayment
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.accent }}>₹</span>
                  <input
                    id="extra-repayment-input"
                    type="number"
                    min="0"
                    step="1000"
                    value={extraMonthly}
                    onChange={(e) => setExtraMonthly(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: 110,
                      padding: "4px 8px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      color: THEME.accent,
                      fontSize: 14,
                      fontWeight: 800,
                      textAlign: "right",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="cxo-slider"
                aria-label="Extra monthly repayment slider"
                style={{
                  width: "100%",
                  accentColor: THEME.accent,
                  height: 6,
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: THEME.muted,
                  marginTop: 4,
                  fontWeight: 600,
                }}
              >
                <span>₹0 (Standard)</span>
                <span>₹50,000</span>
                <span>₹1,00,000</span>
              </div>

              {/* Quick Presets */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {[0, 5000, 10000, 25000, 50000].map((amt) => {
                  const isActive = extraMonthly === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => setExtraMonthly(amt)}
                      className="card-lift"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: `1px solid ${isActive ? THEME.accent : THEME.line}`,
                        background: isActive
                          ? `color-mix(in srgb, ${THEME.accent} 12%, var(--surface-0))`
                          : "var(--surface-0)",
                        color: isActive ? THEME.accent : THEME.muted,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {amt === 0 ? "₹0 Base" : `+₹${(amt / 1000).toFixed(0)}k/mo`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* One-time Windfall Paydown */}
            <div style={{ paddingTop: 14, borderTop: `1px solid ${THEME.line}` }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  One-Time Lump Sum Windfall (Bonus / Asset Sale)
                </label>
                {windfall && (
                  <button
                    onClick={() => setWindfall("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: THEME.rust,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. ₹1,00,000 bonus"
                  value={windfall}
                  onChange={(e) =>
                    setWindfall(
                      e.target.value === "" ? "" : String(Math.max(0, Number(e.target.value)))
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${windfall ? THEME.sage : THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              {/* Quick Windfall Chips */}
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[25000, 50000, 100000, 250000, 500000].map((val) => {
                  const isActive = windfall === String(val);
                  return (
                    <button
                      key={val}
                      onClick={() => setWindfall(String(val))}
                      className="card-lift"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: `1px solid ${isActive ? THEME.sage : THEME.line}`,
                        background: isActive
                          ? `color-mix(in srgb, ${THEME.sage} 14%, var(--surface-0))`
                          : "var(--surface-0)",
                        color: isActive ? THEME.sage : THEME.muted,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      +<Money value={val} variant="full" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Right: Comparative Savings Scorecard */}
        <Card
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 94%, var(--t-sage) 6%), var(--surface-0))",
            border: `1px solid ${THEME.line}`,
            borderTop: `4px solid ${THEME.sage}`,
            borderRadius: "var(--radius-xl)",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                }}
              >
                <Sparkles size={14} color={THEME.sage} /> Total Interest Saved
              </div>
              <Badge variant="sage" style={{ fontSize: 10, fontWeight: 800 }}>
                {selectedPlan.toUpperCase()}
              </Badge>
            </div>

            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(34px, 5vw, 46px)",
                fontWeight: 900,
                color: THEME.sage,
                marginBottom: 6,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={interestSaved} variant="exact" />
            </div>

            <div style={{ fontSize: 13.5, color: THEME.muted, fontWeight: 600, lineHeight: 1.5 }}>
              Accelerated Debt-Free Date:{" "}
              <b style={{ color: THEME.sage }}>{getPayoffDateStr(currentSim.months)}</b>
              <br />
              Timeline Reduction:{" "}
              <b style={{ color: THEME.sage }}>
                {monthsSaved} Months ({monthsSaved > 0 ? (monthsSaved / 12).toFixed(1) : 0} Years
                Sooner)
              </b>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${THEME.line}`,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                Baseline Interest
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: THEME.ink,
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Money value={standardInterest} variant="exact" />
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Standard {getPayoffDateStr(standardSim.months)}
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                Optimized Interest
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: THEME.sage,
                  marginTop: 2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Money value={currentInterest} variant="exact" />
              </div>
              <div style={{ fontSize: 10, color: THEME.sage, marginTop: 2, fontWeight: 700 }}>
                -₹{interestSaved.toLocaleString("en-IN", { maximumFractionDigits: 0 })} reduced
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── STRATEGY SELECTOR CARDS ── */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            Select Strategic Payoff Algorithm
          </div>
          {activeLoans.length > 1 && interestDiffVsOtherPlan > 1 && (
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
              💡 <b style={{ color: THEME.ink }}>{cheaperPlan}</b> saves{" "}
              <Money value={interestDiffVsOtherPlan} variant="exact" /> more interest than{" "}
              {cheaperPlan === "Avalanche" ? "Snowball" : "Avalanche"}
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
            gap: 14,
          }}
        >
          {[
            {
              id: "avalanche" as const,
              title: "Debt Avalanche",
              subtitle: "Highest Rate First",
              badge: "Mathematically Optimal",
              badgeVariant: "accent" as const,
              color: THEME.accent,
              desc: "Targets debts with highest APR (e.g. 36-42% credit cards) first. Saves maximum total interest.",
              totalInt: avalancheSim.totalInterestPaid,
              months: avalancheSim.months,
            },
            {
              id: "snowball" as const,
              title: "Debt Snowball",
              subtitle: "Lowest Balance First",
              badge: "Psychological Wins",
              badgeVariant: "gold" as const,
              color: THEME.gold,
              desc: "Eliminates smallest balances first to reduce number of open loans and create quick motivational momentum.",
              totalInt: snowballSim.totalInterestPaid,
              months: snowballSim.months,
            },
            {
              id: "cashflow" as const,
              title: "Cashflow Relief",
              subtitle: "Highest EMI First",
              badge: "Liquidity Maximizer",
              badgeVariant: "sage" as const,
              color: THEME.sage,
              desc: "Targets the loan with the highest monthly payment first, liberating monthly contractual cash flow fastest.",
              totalInt: cashflowSim.totalInterestPaid,
              months: cashflowSim.months,
            },
          ].map((strategy) => {
            const isSelected = selectedPlan === strategy.id;
            return (
              <div
                key={strategy.id}
                onClick={() => setSelectedPlan(strategy.id)}
                className="card-lift"
                style={{
                  padding: "18px 20px",
                  borderRadius: 16,
                  border: `2px solid ${isSelected ? strategy.color : THEME.line}`,
                  background: isSelected
                    ? `color-mix(in srgb, ${strategy.color} 8%, var(--surface-0))`
                    : "var(--surface-0)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: isSelected ? strategy.color : THEME.ink,
                        }}
                      >
                        {strategy.title}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                        {strategy.subtitle}
                      </div>
                    </div>
                    <Badge variant={strategy.badgeVariant} style={{ fontSize: 9.5 }}>
                      {strategy.badge}
                    </Badge>
                  </div>

                  <p
                    style={{
                      fontSize: 11.5,
                      color: THEME.muted,
                      lineHeight: 1.45,
                      margin: "8px 0 14px 0",
                      fontWeight: 500,
                    }}
                  >
                    {strategy.desc}
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: 10,
                    borderTop: `1px solid ${THEME.line}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 11.5,
                  }}
                >
                  <div>
                    <span style={{ color: THEME.muted }}>Interest: </span>
                    <b style={{ color: THEME.ink }}>
                      <Money value={strategy.totalInt} variant="exact" />
                    </b>
                  </div>
                  <div style={{ fontWeight: 800, color: strategy.color }}>
                    {getPayoffDateStr(strategy.months)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CAPPED HORIZON WARNINGS ── */}
      {currentSimCapped && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 14,
            border: `1.5px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
            background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            color: THEME.rust,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>
            At current extra monthly payment, one or more debts will exceed 50 years to clear.
            Increase your extra monthly repayment to establish a finite payoff horizon.
          </span>
        </div>
      )}

      {standardCapped && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 14,
            border: `1.5px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
            background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
            color: THEME.rust,
            fontSize: 12.5,
            fontWeight: 600,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <b>Negative Amortization Alert:</b> Under standard base payment, at least one debt's
            monthly interest exceeds its payment. The baseline savings comparison is floored at 50
            years.
          </span>
        </div>
      )}

      {/* ── VIEW TABS: TIMELINE ROADMAP vs AMORTIZATION CHART vs BREAKDOWN ── */}
      <Card style={{ padding: 24, borderRadius: "var(--radius-xl)" }}>
        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
            borderBottom: `1px solid ${THEME.line}`,
            paddingBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "timeline" as const, label: "Chronological Payoff Roadmap", icon: <Layers size={14} /> },
              { id: "chart" as const, label: "Paydown Trajectory Curve", icon: <TrendingDown size={14} /> },
              { id: "breakdown" as const, label: "Debt Portfolio Breakdown", icon: <PieIcon size={14} /> },
            ].map((tab) => {
              const isActive = activeViewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveViewTab(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `1px solid ${isActive ? THEME.accent : "transparent"}`,
                    background: isActive
                      ? `color-mix(in srgb, ${THEME.accent} 12%, var(--surface-0))`
                      : "transparent",
                    color: isActive ? THEME.accent : THEME.muted,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
              Order: <b>{selectedPlan.toUpperCase()}</b>
            </span>
          </div>
        </div>

        {/* TAB 1: CHRONOLOGICAL PAYOFF ROADMAP */}
        {activeViewTab === "timeline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {timelineRows.map((l: any, idx: number) => {
              const {
                targetPayoffMonth,
                monthsSavedOnLoan,
                rolledOver,
                interestPaid,
                interestSavedOnLoan,
              } = l;

              const isFirst = idx === 0;

              return (
                <div
                  key={l.id}
                  className="card-lift"
                  style={{
                    padding: "16px 20px",
                    borderRadius: 16,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${isFirst ? `color-mix(in srgb, ${THEME.accent} 40%, ${THEME.line})` : THEME.line}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                    position: "relative",
                  }}
                >
                  {/* Step Rank Pill */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: isFirst
                        ? THEME.accent
                        : `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                      color: isFirst ? "#ffffff" : THEME.sage,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    #{idx + 1}
                  </div>

                  {/* Lender & Brand Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 200, flex: "1 1 200px" }}>
                    <BankLogo name={l.lender} size={32} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                          {l.lender}
                        </span>
                        <Badge variant="muted" style={{ fontSize: 9 }}>
                          {l.type}
                        </Badge>
                        <Badge
                          variant={l.rate >= 20 ? "rust" : l.rate >= 10 ? "gold" : "sage"}
                          style={{ fontSize: 9 }}
                        >
                          {l.rate.toFixed(2)}% APR
                        </Badge>
                        {l.emiIsEstimate && (
                          <Badge variant="muted" style={{ fontSize: 9 }}>
                            Est. Min Due
                          </Badge>
                        )}
                      </div>

                      <div style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 600, marginTop: 4 }}>
                        Balance: <b style={{ color: THEME.ink }}><Money value={l.outstanding} variant="exact" /></b>
                        {" "} &bull; {" "}
                        {l.emiIsEstimate ? "Est. Payment" : "Monthly EMI"}:{" "}
                        <b style={{ color: THEME.ink }}><Money value={l.emi} variant="exact" />/mo</b>
                      </div>
                    </div>
                  </div>

                  {/* Prepayment & Rollover Impact */}
                  <div style={{ minWidth: 160, flex: "1 1 160px" }}>
                    <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                      Interest Under Plan: <Money value={interestPaid} variant="exact" />
                    </div>
                    {interestSavedOnLoan > 0 && (
                      <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 800, marginTop: 2 }}>
                        Saved <Money value={interestSavedOnLoan} variant="exact" /> Interest
                      </div>
                    )}
                    {rolledOver > 0 && (
                      <div
                        style={{
                          fontSize: 10.5,
                          color: THEME.accent,
                          fontWeight: 700,
                          marginTop: 2,
                        }}
                      >
                        +<Money value={rolledOver} variant="exact" /> surplus rolled in
                      </div>
                    )}
                  </div>

                  {/* Payoff Date Target Badge */}
                  <div
                    style={{
                      textAlign: "right",
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 4,
                      minWidth: 120,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: THEME.sage,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {getPayoffDateStr(targetPayoffMonth)}
                    </div>
                    {monthsSavedOnLoan > 0 ? (
                      <Badge variant="sage" style={{ fontSize: 9.5, padding: "3px 8px" }}>
                        Shaved {monthsSavedOnLoan} Month{monthsSavedOnLoan !== 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge variant="muted" style={{ fontSize: 9.5 }}>
                        Standard Timeline
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Rollover Cascade Explainer */}
            <div
              style={{
                marginTop: 8,
                padding: "14px 18px",
                borderRadius: 14,
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <Lightbulb size={18} color={THEME.gold} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5 }}>
                <b style={{ color: THEME.ink }}>How Rollovers Work in this Strategy:</b> When Debt #1 is
                cleared in <b>{getPayoffDateStr(timelineRows[0]?.targetPayoffMonth || 0)}</b>, its entire{" "}
                <b style={{ color: THEME.ink }}>
                  <Money value={timelineRows[0]?.emi || 0} variant="exact" />/mo
                </b>{" "}
                payment is automatically appended to your prepayments on Debt #2. This compounds
                your payoff velocity month after month without increasing your total budget!
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYDOWN TRAJECTORY CHART (RECHARTS) */}
        {activeViewTab === "chart" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                Debt Balance Amortization Trajectory Over Time
              </h4>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: THEME.muted }}>
                Comparing portfolio balance reduction curve across Standard Baseline vs Avalanche vs
                Snowball.
              </p>
            </div>

            <div style={{ width: "100%", height: 320, minHeight: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trajectoryChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorStandard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.muted} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={THEME.muted} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorAvalanche" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={THEME.accent} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorSnowball" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={THEME.gold} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.6} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    stroke={THEME.line}
                  />
                  <YAxis
                    tickFormatter={(val) => fmtINR(val)}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    stroke={THEME.line}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      fmtINRExact(value),
                      name === "Standard"
                        ? "Standard (No Extra)"
                        : name === "Avalanche"
                        ? "Avalanche Strategy"
                        : "Snowball Strategy",
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: "var(--surface-0)",
                      borderColor: THEME.line,
                      borderRadius: 10,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(val) => (
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                        {val}
                      </span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="Standard"
                    stroke={THEME.muted}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorStandard)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Avalanche"
                    stroke={THEME.accent}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorAvalanche)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Snowball"
                    stroke={THEME.gold}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorSnowball)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 3: PORTFOLIO BREAKDOWN */}
        {activeViewTab === "breakdown" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: 16 }}>
            {activeLoans.map((loan) => {
              const pctOfTotal =
                totalOutstandingDebt > 0 ? (loan.outstanding / totalOutstandingDebt) * 100 : 0;
              return (
                <div
                  key={loan.id}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <BankLogo name={loan.lender} size={24} />
                      <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                        {loan.lender}
                      </span>
                    </div>
                    <Badge variant={loan.rate >= 20 ? "rust" : loan.rate >= 10 ? "gold" : "sage"}>
                      {loan.rate}%
                    </Badge>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, marginBottom: 4 }}>
                    <Money value={loan.outstanding} variant="exact" />
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8 }}>
                    {pctOfTotal.toFixed(1)}% of total liabilities &bull; EMI:{" "}
                    <Money value={loan.emi} variant="exact" />
                  </div>

                  {/* Progress Bar */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "var(--surface-1)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, pctOfTotal)}%`,
                        background: loan.rate >= 20 ? THEME.rust : THEME.accent,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── CFO STRATEGIC ADVISORY CARD ── */}
      <Card
        style={{
          padding: 24,
          borderLeft: `4px solid ${THEME.accent}`,
          background: "var(--surface-0)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ color: THEME.accent, flexShrink: 0, marginTop: 2 }}>
            <Info size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h4
              style={{
                fontWeight: 800,
                fontSize: 14.5,
                color: THEME.ink,
                marginBottom: 8,
                letterSpacing: "-0.01em",
              }}
            >
              CFO Strategic Intelligence: Prepayment Optimization Principles
            </h4>
            <p
              style={{
                fontSize: 12.5,
                color: THEME.muted,
                lineHeight: 1.6,
                margin: 0,
                fontWeight: 500,
              }}
            >
              In personal wealth engineering, liabilities with rates above 12% (such as credit card
              revolving balances at 36-42% or unsecured personal loans) constitute a severe drag on
              net worth growth. By directing an extra{" "}
              <b style={{ color: THEME.ink }}>₹{(extraMonthly || 0).toLocaleString("en-IN")}/mo</b>,
              you effectively generate a guaranteed risk-free return equal to your highest loan's
              APR ({Math.max(...activeLoans.map((l) => l.rate)).toFixed(2)}%), saving{" "}
              <b style={{ color: THEME.sage }}>
                <Money value={interestSaved} variant="exact" />
              </b>{" "}
              in pure interest.
            </p>
          </div>
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
         MODAL 1: TARGET DEBT-FREE DATE SOLVER
         ══════════════════════════════════════════════════════════════════════ */}
      {showGoalSolverModal && (
        <Modal
          title="Target Debt-Free Date Reverse Solver"
          onClose={() => setShowGoalSolverModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 8 }}>
            <p style={{ fontSize: 13, color: THEME.muted, margin: 0, lineHeight: 1.5 }}>
              Choose your ideal goal timeline. Our mathematical solver will calculate the exact
              monthly surplus required to be 100% debt-free by that date.
            </p>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink, display: "block", marginBottom: 8 }}>
                Desired Debt-Free Horizon
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                {[12, 18, 24, 36, 48, 60].map((m) => {
                  const isSel = targetDebtFreeMonths === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setTargetDebtFreeMonths(m)}
                      className="card-lift"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1.5px solid ${isSel ? THEME.accent : THEME.line}`,
                        background: isSel
                          ? `color-mix(in srgb, ${THEME.accent} 12%, var(--surface-0))`
                          : "var(--surface-0)",
                        color: isSel ? THEME.accent : THEME.ink,
                        fontWeight: 800,
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      {m} Months
                      <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 500, marginTop: 2 }}>
                        {getPayoffDateStr(m)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calculated Required Surplus Card */}
            <div
              style={{
                padding: "18px 20px",
                borderRadius: 14,
                background: "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 90%, var(--t-accent) 10%), var(--surface-0))",
                border: `1.5px solid ${THEME.accent}`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, letterSpacing: "0.1em" }}>
                Required Extra Monthly Payment
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: THEME.accent,
                  margin: "6px 0",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Money value={requiredSurplusForTargetDate} variant="exact" />
                <span style={{ fontSize: 16, fontWeight: 600, color: THEME.muted }}>/month</span>
              </div>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                Total Monthly Payment:{" "}
                <b style={{ color: THEME.ink }}>
                  <Money value={totalMonthlyCommitment + requiredSurplusForTargetDate} variant="exact" />
                </b>{" "}
                (Base + Extra)
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <Button variant="secondary" onClick={() => setShowGoalSolverModal(false)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                onClick={() => {
                  setExtraMonthly(requiredSurplusForTargetDate);
                  setShowGoalSolverModal(false);
                }}
              >
                Apply ₹{requiredSurplusForTargetDate.toLocaleString("en-IN")} to Simulator
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         MODAL 2: DEBT CONSOLIDATION / REFINANCE SIMULATOR
         ══════════════════════════════════════════════════════════════════════ */}
      {showConsolidationModal && (
        <Modal
          title="Debt Consolidation & Refinance Modeler"
          onClose={() => setShowConsolidationModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 8 }}>
            <p style={{ fontSize: 12.5, color: THEME.muted, margin: 0, lineHeight: 1.5 }}>
              Simulate rolling multiple high-APR credit cards and high-rate loans into a single low-rate
              personal or balance-transfer loan.
            </p>

            {/* Select Debts to Consolidate */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                  Select Debts to Consolidate:
                </span>
                <button
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    activeLoans.forEach((d) => (all[d.id] = true));
                    setSelectedForConsolidation(all);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: THEME.accent,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Select All
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                {activeLoans.map((d) => {
                  const isChecked = !!selectedForConsolidation[d.id];
                  return (
                    <label
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: `1px solid ${isChecked ? THEME.accent : THEME.line}`,
                        background: isChecked
                          ? `color-mix(in srgb, ${THEME.accent} 8%, var(--surface-0))`
                          : "var(--surface-0)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelectedForConsolidation({
                              ...selectedForConsolidation,
                              [d.id]: e.target.checked,
                            })
                          }
                          style={{ width: 15, height: 15, accentColor: THEME.accent }}
                        />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                          {d.lender} ({d.type})
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                        <Money value={d.outstanding} variant="exact" /> @ <b>{d.rate}%</b>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Loan Terms Input */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, display: "block", marginBottom: 6 }}>
                  Consolidated APR (%)
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="5"
                  max="30"
                  value={consolidationRate}
                  onChange={(e) => setConsolidationRate(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, display: "block", marginBottom: 6 }}>
                  New Loan Tenure (Months)
                </label>
                <input
                  type="number"
                  step="6"
                  min="6"
                  max="120"
                  value={consolidationTenureMonths}
                  onChange={(e) => setConsolidationTenureMonths(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            {/* Analysis Results Scorecard */}
            {consolidationAnalysis.selectedCount > 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    Principal Consolidated
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, marginTop: 2 }}>
                    <Money value={consolidationAnalysis.totalConsolidatedPrincipal} variant="exact" />
                  </div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>
                    Weighted Rate: {consolidationAnalysis.existingWeightedRate.toFixed(1)}% → {consolidationRate}%
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    New Consolidated EMI
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: THEME.accent, marginTop: 2 }}>
                    <Money value={consolidationAnalysis.newConsolidatedEmi} variant="exact" />/mo
                  </div>
                  <div style={{ fontSize: 10.5, color: consolidationAnalysis.monthlyCashFlowSavings >= 0 ? THEME.sage : THEME.rust, marginTop: 2, fontWeight: 700 }}>
                    {consolidationAnalysis.monthlyCashFlowSavings >= 0 ? "Frees up " : "Increases payment by "}
                    <Money value={Math.abs(consolidationAnalysis.monthlyCashFlowSavings)} variant="exact" />/mo
                  </div>
                </div>

                <div style={{ gridColumn: "1 / -1", paddingTop: 10, borderTop: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                    Estimated Net Interest Savings:
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: THEME.sage, marginTop: 2 }}>
                    <Money value={consolidationAnalysis.netInterestSaved} variant="exact" />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 16, color: THEME.muted, fontSize: 12 }}>
                Select at least one debt above to model consolidation.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="accent" onClick={() => setShowConsolidationModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         MODAL 3: MANAGE DEBTS & GRANULAR INCLUSION/EXCLUSION
         ══════════════════════════════════════════════════════════════════════ */}
      {showManageDebtsModal && (
        <Modal
          title="Select Debts Included in Optimization"
          onClose={() => setShowManageDebtsModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 8 }}>
            <p style={{ fontSize: 12.5, color: THEME.muted, margin: 0 }}>
              Check the debts you want to include in the prepayment acceleration simulation. Unchecked
              debts will be excluded from the model.
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Active Debts ({allAvailableDebts.length})
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setExcludedDebtIds({})}
                  style={{
                    background: "none",
                    border: "none",
                    color: THEME.accent,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Select All
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {allAvailableDebts.map((d) => {
                const isExcluded = !!excludedDebtIds[d.id];
                return (
                  <label
                    key={d.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: `1.5px solid ${!isExcluded ? THEME.accent : THEME.line}`,
                      background: !isExcluded
                        ? `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0))`
                        : "var(--surface-0)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={(e) =>
                          setExcludedDebtIds({
                            ...excludedDebtIds,
                            [d.id]: !e.target.checked,
                          })
                        }
                        style={{ width: 16, height: 16, accentColor: THEME.accent }}
                      />
                      <BankLogo name={d.lender} size={24} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                          {d.lender}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>
                          {d.type} &bull; {d.rate}% APR
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                        <Money value={d.outstanding} variant="exact" />
                      </div>
                      <div style={{ fontSize: 10.5, color: THEME.muted }}>
                        EMI: <Money value={d.emi} variant="exact" />/mo
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <Button variant="accent" onClick={() => setShowManageDebtsModal(false)}>
                Save & Update Model
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
