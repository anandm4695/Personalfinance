import React, { useState, useMemo, useEffect } from "react";
import {
  Flame,
  TrendingUp,
  IndianRupee,
  Calendar,
  Target,
  Clock,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Sliders,
  Coffee,
  Gem,
  Compass,
  CheckCircle2,
  PieChart as PieChartIcon,
  ArrowRight,
  Download,
  Printer,
  Copy,
  Check,
  Layers,
  BarChart3,
  Info,
  ShieldCheck,
  ShieldAlert,
  Percent,
  SlidersHorizontal,
  RefreshCw,
  Wallet,
  Building2,
  Coins,
  ChevronRight,
  TrendingDown,
  FileSpreadsheet,
  Activity,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, computeFireTarget } from "../../utils/finance";
import { useMasterData, calculateAge } from "../../utils/masterData";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

const SWR_DEFAULT = 4;
const FIRE_INPUTS_STORAGE_KEY = "finance_fire_planner_inputs_v2";

export type FireArchetype = "regular" | "lean" | "fat" | "coast" | "barista" | "flamingo";

// Advanced projection solver supporting Annual Step-Up in savings
const solveTimeToFIRE = (
  annualExpense: number,
  swrPercent: number,
  inflationPercent: number,
  returnPercent: number,
  currentNW: number,
  initialMonthlySavings: number,
  annualStepUpPct: number = 0
): { monthsToFIRE: number; reachedFIRE: boolean; finalCorpus: number } => {
  const monthlyRet = returnPercent / 100 / 12;
  let corpus = Math.max(0, currentNW);
  let monthsToFIRE = 0;
  const maxMonths = 600; // 50 years limit
  let currentMonthlySavings = initialMonthlySavings;

  while (monthsToFIRE < maxMonths) {
    const yearsElapsed = monthsToFIRE / 12;
    // Apply step-up at each full year boundary
    if (monthsToFIRE > 0 && monthsToFIRE % 12 === 0 && annualStepUpPct > 0) {
      currentMonthlySavings *= 1 + annualStepUpPct / 100;
    }

    const dynamicFireTarget = computeFireTarget(
      annualExpense,
      yearsElapsed,
      swrPercent,
      inflationPercent
    );

    if (corpus >= dynamicFireTarget && dynamicFireTarget > 0) {
      return { monthsToFIRE, reachedFIRE: true, finalCorpus: corpus };
    }

    corpus = corpus * (1 + monthlyRet) + currentMonthlySavings;
    monthsToFIRE++;
  }

  const finalTarget = computeFireTarget(
    annualExpense,
    monthsToFIRE / 12,
    swrPercent,
    inflationPercent
  );
  return {
    monthsToFIRE,
    reachedFIRE: corpus >= finalTarget && finalTarget > 0,
    finalCorpus: corpus,
  };
};

const loadSavedFireInputs = (): Record<string, any> => {
  try {
    const raw = localStorage.getItem(FIRE_INPUTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const FIREPlannerTab = ({ state, metrics }: any) => {
  const { privacyMode } = usePrivacy();
  const masterData = useMasterData();
  const familyProfiles = masterData?.familyProfiles || state?.masterData?.familyProfiles || [];
  const savedInputs = useMemo(() => loadSavedFireInputs(), []);

  const selfProfile = familyProfiles.find(
    (p: any) => p.relationship === "Self" || p.id === "self" || p.relation === "Self"
  );
  const selfAge = selfProfile?.dob ? calculateAge(selfProfile.dob) : null;
  const defaultCurrentAge = savedInputs.currentAge ?? (selfAge ?? 30);

  // Active Tab Mode
  const [activeTab, setActiveTab] = useState<
    "cockpit" | "studio" | "trajectory" | "stress" | "bucket" | "playbook"
  >("cockpit");

  // Core Inputs State
  const [archetype, setArchetype] = useState<FireArchetype>(
    savedInputs.archetype ?? "regular"
  );
  const [monthlyExpense, setMonthlyExpense] = useState(
    savedInputs.monthlyExpense ?? Math.round(metrics.monthExpense || 50000)
  );
  const [inflationRate, setInflationRate] = useState(savedInputs.inflationRate ?? 6.0);
  const [returnRate, setReturnRate] = useState(savedInputs.returnRate ?? 12.0);
  const [postRetireReturn, setPostRetireReturn] = useState(savedInputs.postRetireReturn ?? 8.0);
  const [swr, setSwr] = useState(savedInputs.swr ?? SWR_DEFAULT);
  const [currentAge, setCurrentAge] = useState(defaultCurrentAge);
  const [targetAge, setTargetAge] = useState(
    savedInputs.targetAge ?? Math.max(45, defaultCurrentAge + 12)
  );
  const [lifeExpectancy, setLifeExpectancy] = useState(savedInputs.lifeExpectancy ?? 85);
  const [monthlySavings, setMonthlySavings] = useState(
    savedInputs.monthlySavings ??
      Math.max(0, Math.round((metrics.monthIncome || 0) - (metrics.monthExpense || 0)))
  );
  const [annualStepUp, setAnnualStepUp] = useState(savedInputs.annualStepUp ?? 5);
  const [baristaIncome, setBaristaIncome] = useState(savedInputs.baristaIncome ?? 30000);
  const [chartView, setChartView] = useState<"accumulation" | "drawdown">("accumulation");
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Asset Eligibility Filters for FI Net Worth calculation
  const [includeEquities, setIncludeEquities] = useState(savedInputs.includeEquities ?? true);
  const [includeFixedIncome, setIncludeFixedIncome] = useState(savedInputs.includeFixedIncome ?? true);
  const [includeRetirement, setIncludeRetirement] = useState(savedInputs.includeRetirement ?? true);
  const [includeGold, setIncludeGold] = useState(savedInputs.includeGold ?? true);
  const [includeRealEstate, setIncludeRealEstate] = useState(savedInputs.includeRealEstate ?? false);

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(
        FIRE_INPUTS_STORAGE_KEY,
        JSON.stringify({
          archetype,
          monthlyExpense,
          inflationRate,
          returnRate,
          postRetireReturn,
          swr,
          currentAge,
          targetAge,
          lifeExpectancy,
          monthlySavings,
          annualStepUp,
          baristaIncome,
          includeEquities,
          includeFixedIncome,
          includeRetirement,
          includeGold,
          includeRealEstate,
        })
      );
    } catch {}
  }, [
    archetype,
    monthlyExpense,
    inflationRate,
    returnRate,
    postRetireReturn,
    swr,
    currentAge,
    targetAge,
    lifeExpectancy,
    monthlySavings,
    annualStepUp,
    baristaIncome,
    includeEquities,
    includeFixedIncome,
    includeRetirement,
    includeGold,
    includeRealEstate,
  ]);

  // Extract portfolio asset aggregates from state
  const portfolioAssets = useMemo(() => {
    const pState = state || {};

    // Equities & Mutual Funds
    const mfEquity = (pState.mutualFunds || []).reduce((sum: number, m: any) => {
      const units = Number(m.units || 0);
      const nav = Number(m.nav || m.currentNav || m.purchaseNav || 0);
      return sum + units * nav;
    }, 0);
    const stocksVal = (pState.stocks || []).reduce((sum: number, s: any) => {
      const qty = Number(s.quantity || s.qty || 0);
      const price = Number(s.currentPrice || s.ltp || s.buyPrice || 0);
      return sum + qty * price;
    }, 0);
    const equitiesTotal = mfEquity + stocksVal;

    // Fixed Income & Cash
    const bankCash = (pState.bankAccounts || []).reduce(
      (sum: number, b: any) => sum + Number(b.balance || 0),
      0
    );
    const fdVal = (pState.fixedDeposits || []).reduce(
      (sum: number, f: any) => sum + Number(f.amount || f.principal || 0),
      0
    );
    const rdVal = (pState.recurringDeposits || []).reduce(
      (sum: number, r: any) => sum + Number(r.monthlyInstallment || 0) * 12,
      0
    );
    const bondsVal = (pState.bonds || []).reduce(
      (sum: number, b: any) => sum + Number(b.investedAmount || b.amount || 0),
      0
    );
    const fixedIncomeTotal = bankCash + fdVal + rdVal + bondsVal;

    // Retirement (EPF, PPF, NPS)
    const epfVal = (pState.epf || []).reduce(
      (sum: number, e: any) => sum + Number(e.totalBalance || e.balance || 0),
      0
    );
    const ppfVal = (pState.ppf || []).reduce(
      (sum: number, p: any) => sum + Number(p.currentBalance || p.balance || 0),
      0
    );
    const npsVal = (pState.nps || []).reduce(
      (sum: number, n: any) => sum + Number(n.currentCorpus || n.tier1Balance || 0),
      0
    );
    const retirementTotal = epfVal + ppfVal + npsVal;

    // Gold & SGB
    const goldVal = (pState.goldHoldings || []).reduce(
      (sum: number, g: any) => sum + Number(g.currentValue || (g.grams || 0) * 7000),
      0
    );

    // Real Estate
    const reVal = (pState.realEstateProperties || []).reduce(
      (sum: number, r: any) => sum + Number(r.currentValuation || r.purchasePrice || 0),
      0
    );

    // Filtered FI Net Worth
    let eligibleNetWorth = 0;
    if (includeEquities) eligibleNetWorth += equitiesTotal;
    if (includeFixedIncome) eligibleNetWorth += fixedIncomeTotal;
    if (includeRetirement) eligibleNetWorth += retirementTotal;
    if (includeGold) eligibleNetWorth += goldVal;
    if (includeRealEstate) eligibleNetWorth += reVal;

    // Fallback if no specific state breakdown
    if (eligibleNetWorth === 0 && (metrics.netWorth || 0) > 0) {
      eligibleNetWorth = Math.max(0, metrics.netWorth || 0);
    }

    return {
      equitiesTotal,
      fixedIncomeTotal,
      retirementTotal,
      goldVal,
      reVal,
      eligibleNetWorth,
      totalNetWorth: Math.max(0, metrics.netWorth || 0),
    };
  }, [
    state,
    metrics.netWorth,
    includeEquities,
    includeFixedIncome,
    includeRetirement,
    includeGold,
    includeRealEstate,
  ]);

  // Main Comprehensive FIRE Calculation Engine
  const fireCalc = useMemo(() => {
    const annualExpense = monthlyExpense * 12;
    const yearsToFIRE = Math.max(0, targetAge - currentAge);
    const retirementYears = Math.max(1, lifeExpectancy - targetAge);

    // Archetype-Specific Multipliers & Targets
    const expenseAtRetirement = annualExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE);

    // 1. Regular FIRE (100% lifestyle)
    const regularFireNumber = computeFireTarget(annualExpense, yearsToFIRE, swr, inflationRate);

    // 2. Lean FIRE (60% core survival burn)
    const leanFireNumber = computeFireTarget(annualExpense * 0.6, yearsToFIRE, swr, inflationRate);

    // 3. Fat FIRE (150% luxury lifestyle with healthcare/travel buffer)
    const fatFireNumber = computeFireTarget(annualExpense * 1.5, yearsToFIRE, swr, inflationRate);

    // 4. Barista FIRE (Net of part-time active earnings)
    const baristaAnnualLiving = Math.max(0, annualExpense - baristaIncome * 12);
    const baristaFireNumber = computeFireTarget(baristaAnnualLiving, yearsToFIRE, swr, inflationRate);

    // 5. Coast FIRE (Corpus needed today that will compound on its own to regularFireNumber at targetAge)
    const coastFireNumber =
      yearsToFIRE > 0
        ? regularFireNumber / Math.pow(1 + returnRate / 100, yearsToFIRE)
        : regularFireNumber;

    // 6. Flamingo FIRE (Accumulate 50% of regular FIRE, then coast while working to cover only expenses)
    const flamingoFireNumber = regularFireNumber * 0.5;

    // Select Active Target
    let activeFireNumber = regularFireNumber;
    let activeAnnualExpense = annualExpense;
    if (archetype === "lean") {
      activeFireNumber = leanFireNumber;
      activeAnnualExpense = annualExpense * 0.6;
    } else if (archetype === "fat") {
      activeFireNumber = fatFireNumber;
      activeAnnualExpense = annualExpense * 1.5;
    } else if (archetype === "barista") {
      activeFireNumber = baristaFireNumber;
      activeAnnualExpense = baristaAnnualLiving;
    } else if (archetype === "coast") {
      activeFireNumber = coastFireNumber;
    } else if (archetype === "flamingo") {
      activeFireNumber = flamingoFireNumber;
    }

    const currentNW = portfolioAssets.eligibleNetWorth;
    const progress = activeFireNumber > 0 ? (currentNW / activeFireNumber) * 100 : 0;
    const coastProgress = coastFireNumber > 0 ? (currentNW / coastFireNumber) * 100 : 0;

    // Time to FI Solver (Incorporating Step-Up)
    const { monthsToFIRE, reachedFIRE, finalCorpus } = solveTimeToFIRE(
      activeAnnualExpense,
      swr,
      inflationRate,
      returnRate,
      currentNW,
      monthlySavings,
      annualStepUp
    );
    const yearsToFIREActual = monthsToFIRE / 12;
    const fireAge = currentAge + yearsToFIREActual;

    // Target Date Calculation
    const targetDateObj = new Date();
    targetDateObj.setMonth(targetDateObj.getMonth() + monthsToFIRE);
    const targetDateFormatted = targetDateObj.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });

    // Coasting Date Solver (When will current NW reach Coast FIRE number without adding a single rupee?)
    let monthsToCoast = 0;
    let coastCorpusSim = currentNW;
    const monthlyReturnRate = returnRate / 100 / 12;
    while (monthsToCoast < 600 && coastCorpusSim < coastFireNumber) {
      coastCorpusSim *= 1 + monthlyReturnRate;
      monthsToCoast++;
    }
    const isCoastAchieved = currentNW >= coastFireNumber;
    const coastAge = currentAge + monthsToCoast / 12;

    // Monthly Passive Freedom Dividend generated by current net worth today
    const monthlyFreedomDividend = (currentNW * (swr / 100)) / 12;
    const freedomDividendCoveragePct =
      monthlyExpense > 0 ? (monthlyFreedomDividend / monthlyExpense) * 100 : 0;

    // FIRE Readiness Score (0 to 100 algorithm based on progress, savings rate, and coast ratio)
    const savingsRatio =
      metrics.monthIncome && metrics.monthIncome > 0
        ? Math.min(1, monthlySavings / metrics.monthIncome)
        : 0.3;
    const readinessScore = Math.min(
      100,
      Math.round(
        Math.min(100, progress) * 0.55 +
          Math.min(100, coastProgress) * 0.25 +
          savingsRatio * 100 * 0.2
      )
    );

    // Milestones Array (25% Quarter, 50% Half, 75% Flamingo, 100% Full, 125% Fat)
    const milestones = [
      {
        pct: 25,
        title: "Quarter FIRE (1/4 Milestone)",
        desc: "Covers 25% of lifetime living costs passively",
        corpus: activeFireNumber * 0.25,
        reached: currentNW >= activeFireNumber * 0.25,
      },
      {
        pct: 50,
        title: "Half FIRE / Semi-FI",
        desc: "50% freedom achieved; can downshift to part-time",
        corpus: activeFireNumber * 0.5,
        reached: currentNW >= activeFireNumber * 0.5,
      },
      {
        pct: 75,
        title: "Flamingo FIRE (3/4 Milestone)",
        desc: "Coasting zone; compound growth outpaces savings",
        corpus: activeFireNumber * 0.75,
        reached: currentNW >= activeFireNumber * 0.75,
      },
      {
        pct: 100,
        title: "Full Financial Independence (100%)",
        desc: "Completely work-optional for lifetime",
        corpus: activeFireNumber,
        reached: currentNW >= activeFireNumber,
      },
      {
        pct: 125,
        title: "Fat FIRE Cushion (125%)",
        desc: "All-weather luxury buffer & generational wealth",
        corpus: activeFireNumber * 1.25,
        reached: currentNW >= activeFireNumber * 1.25,
      },
    ];

    // Trajectory Accumulation Array
    const accumulation = [];
    const tableSchedule = [];
    let accCorpus = currentNW;
    let runningMonthlySavings = monthlySavings;
    const maxAccYears = Math.min(Math.max(yearsToFIRE + 8, Math.ceil(yearsToFIREActual) + 5), 45);

    for (let y = 0; y <= maxAccYears; y++) {
      const yearAge = currentAge + y;
      const calendarYear = new Date().getFullYear() + y;
      const annualSavingsYear = runningMonthlySavings * 12;
      const targetForYear = computeFireTarget(
        activeAnnualExpense,
        y,
        swr,
        inflationRate
      );

      const investmentReturn = accCorpus * (returnRate / 100);
      const startCorpus = accCorpus;
      const closingCorpus = startCorpus + investmentReturn + annualSavingsYear;

      accumulation.push({
        year: calendarYear,
        age: yearAge,
        corpus: Math.round(startCorpus),
        fireTarget: Math.round(targetForYear),
        label: `Age ${yearAge}`,
      });

      tableSchedule.push({
        year: calendarYear,
        age: yearAge,
        startCorpus: Math.round(startCorpus),
        savingsAdded: Math.round(annualSavingsYear),
        returnsGenerated: Math.round(investmentReturn),
        closingCorpus: Math.round(closingCorpus),
        fireTarget: Math.round(targetForYear),
        reached: startCorpus >= targetForYear,
      });

      accCorpus = closingCorpus;
      if (annualStepUp > 0) {
        runningMonthlySavings *= 1 + annualStepUp / 100;
      }
    }

    // Trajectory Drawdown Array (Post-Retirement)
    const drawdown = [];
    let drawCorpus = activeFireNumber;
    const monthlyInflAdj = inflationRate / 100 / 12;
    const monthlyPostReturn = postRetireReturn / 100 / 12;
    let currentMonthlyExpenseDraw =
      (activeAnnualExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE)) / 12;
    const drawdownYearsTotal = Math.min(Math.max(retirementYears, 40), 55);

    for (let m = 0; m <= drawdownYearsTotal * 12; m++) {
      if (m % 12 === 0) {
        const drawAge = targetAge + Math.floor(m / 12);
        const drawYear = new Date().getFullYear() + yearsToFIRE + Math.floor(m / 12);
        drawdown.push({
          year: drawYear,
          age: drawAge,
          corpus: Math.max(0, Math.round(drawCorpus)),
          annualWithdrawal: Math.round(currentMonthlyExpenseDraw * 12),
          label: `Age ${drawAge}`,
        });
      }
      drawCorpus = drawCorpus * (1 + monthlyPostReturn) - currentMonthlyExpenseDraw;
      currentMonthlyExpenseDraw *= 1 + monthlyInflAdj;
      if (drawCorpus < 0) drawCorpus = 0;
    }

    // Stress Testing Simulations
    // 1. Sequence of Returns Risk (SRR): -20% in first 2 years of retirement
    let srrCorpus = activeFireNumber;
    let srrDepletedAge = null;
    let srrExpense = (activeAnnualExpense * Math.pow(1 + inflationRate / 100, yearsToFIRE)) / 12;
    for (let m = 0; m <= drawdownYearsTotal * 12; m++) {
      const yearIdx = Math.floor(m / 12);
      const monthlyRate =
        yearIdx < 2
          ? -0.2 / 12 // Early bear market drawdown
          : postRetireReturn / 100 / 12;
      srrCorpus = srrCorpus * (1 + monthlyRate) - srrExpense;
      srrExpense *= 1 + monthlyInflAdj;
      if (srrCorpus <= 0 && srrDepletedAge === null) {
        srrDepletedAge = targetAge + yearIdx;
        break;
      }
    }

    // 2. High Inflation Shock: 8.5% inflation vs standard
    let hiCorpus = activeFireNumber;
    let hiDepletedAge = null;
    let hiExpense = (activeAnnualExpense * Math.pow(1 + 0.085, yearsToFIRE)) / 12;
    for (let m = 0; m <= drawdownYearsTotal * 12; m++) {
      const yearIdx = Math.floor(m / 12);
      hiCorpus = hiCorpus * (1 + monthlyPostReturn) - hiExpense;
      hiExpense *= 1 + 0.085 / 12;
      if (hiCorpus <= 0 && hiDepletedAge === null) {
        hiDepletedAge = targetAge + yearIdx;
        break;
      }
    }

    // 3-Bucket System Allocation Calculator (Indian Context)
    // Bucket 1: 2.5 Years expenses in liquid cash/FDs
    // Bucket 2: 5 Years expenses in conservative debt/hybrid
    // Bucket 3: Remaining balance in growth equity
    const bucket1Need = Math.round(expenseAtRetirement * 2.5);
    const bucket2Need = Math.round(expenseAtRetirement * 5.0);
    const bucket3Need = Math.max(0, Math.round(activeFireNumber - bucket1Need - bucket2Need));

    // Acceleration Playbook Calculations
    const accelerateWith5kSip = solveTimeToFIRE(
      activeAnnualExpense,
      swr,
      inflationRate,
      returnRate,
      currentNW,
      monthlySavings + 5000,
      annualStepUp
    );
    const accelerateWith10kSip = solveTimeToFIRE(
      activeAnnualExpense,
      swr,
      inflationRate,
      returnRate,
      currentNW,
      monthlySavings + 10000,
      annualStepUp
    );
    const accelerateCut5kExpense = solveTimeToFIRE(
      Math.max(10000, (monthlyExpense - 5000) * 12),
      swr,
      inflationRate,
      returnRate,
      currentNW,
      monthlySavings + 5000,
      annualStepUp
    );
    const accelerateRental20k = solveTimeToFIRE(
      Math.max(10000, (monthlyExpense - 20000) * 12),
      swr,
      inflationRate,
      returnRate,
      currentNW,
      monthlySavings,
      annualStepUp
    );

    const yearsSaved10kSip = Math.max(0, yearsToFIREActual - accelerateWith10kSip.monthsToFIRE / 12);
    const yearsSavedCut5k = Math.max(0, yearsToFIREActual - accelerateCut5kExpense.monthsToFIRE / 12);
    const yearsSavedRental20k = Math.max(
      0,
      yearsToFIREActual - accelerateRental20k.monthsToFIRE / 12
    );

    return {
      activeFireNumber,
      regularFireNumber,
      leanFireNumber,
      fatFireNumber,
      baristaFireNumber,
      coastFireNumber,
      flamingoFireNumber,
      progress,
      coastProgress,
      isCoastAchieved,
      coastAge,
      monthsToCoast,
      currentNW,
      yearsToFIREActual,
      fireAge,
      monthsToFIRE,
      reachedFIRE,
      finalCorpus,
      targetDateFormatted,
      expenseAtRetirement,
      monthlyFreedomDividend,
      freedomDividendCoveragePct,
      readinessScore,
      milestones,
      accumulation,
      drawdown,
      tableSchedule,
      stress: {
        srrDepletedAge: srrDepletedAge ?? lifeExpectancy + 5,
        hiDepletedAge: hiDepletedAge ?? lifeExpectancy + 5,
      },
      buckets: {
        bucket1: bucket1Need,
        bucket2: bucket2Need,
        bucket3: bucket3Need,
      },
      acceleration: {
        yearsSaved10kSip,
        yearsSavedCut5k,
        yearsSavedRental20k,
      },
    };
  }, [
    archetype,
    monthlyExpense,
    inflationRate,
    returnRate,
    postRetireReturn,
    swr,
    currentAge,
    targetAge,
    lifeExpectancy,
    monthlySavings,
    annualStepUp,
    baristaIncome,
    portfolioAssets.eligibleNetWorth,
    metrics.monthIncome,
  ]);

  const animatedProgress = useAnimatedNumber(fireCalc.progress);
  const animatedReadiness = useAnimatedNumber(fireCalc.readinessScore);

  // Copy Summary to Clipboard
  const handleCopySummary = () => {
    const text = `🔥 FIRE & Financial Independence Blueprint (${archetype.toUpperCase()})
• Target FIRE Corpus: ${fmtINRFull(fireCalc.activeFireNumber)}
• Current Eligible Net Worth: ${fmtINRFull(fireCalc.currentNW)} (${fireCalc.progress.toFixed(1)}% achieved)
• Monthly Passive Freedom Dividend: ${fmtINR(fireCalc.monthlyFreedomDividend)}/mo (${fireCalc.freedomDividendCoveragePct.toFixed(1)}% living expenses)
• Projected FI Age: ${fireCalc.fireAge.toFixed(1)} yrs (${fireCalc.targetDateFormatted})
• Assumptions: Return: ${returnRate}% | Inflation: ${inflationRate}% | SWR: ${swr}% | Monthly Savings: ${fmtINR(monthlySavings)}
Generated via Personal Finance by Anand Mohta`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Export CSV Schedule
  const handleExportCSV = () => {
    const headers = [
      "Year",
      "Age",
      "Start Corpus (₹)",
      "Fresh Savings (₹)",
      "Returns (₹)",
      "Closing Corpus (₹)",
      "FIRE Target (₹)",
      "FIRE Reached",
    ];
    const rows = fireCalc.tableSchedule.map((row) => [
      row.year,
      row.age,
      row.startCorpus,
      row.savingsAdded,
      row.returnsGenerated,
      row.closingCorpus,
      row.fireTarget,
      row.reached ? "YES" : "NO",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FIRE_Trajectory_Schedule_${archetype}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tab-content-enter">
      {/* Header & Section Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <SectionTitle sub="Executive command center for financial independence, withdrawal strategies, stress-testing, and early retirement milestones">
            FIRE Command Center & FI Planner
          </SectionTitle>
        </div>

        {/* Global Blueprint Action Buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopySummary}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          >
            {copiedSummary ? <Check size={14} color={THEME.sage} /> : <Copy size={14} />}
            {copiedSummary ? "Copied Blueprint!" : "Copy Summary"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          >
            <Download size={14} /> Export CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          >
            <Printer size={14} /> Print
          </Button>
        </div>
      </div>

      {/* Hero Freedom Cockpit */}
      <Card
        variant="base"
        style={{
          marginBottom: 20,
          padding: "clamp(20px, 3.5vw, 32px)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 90%, var(--t-accent) 10%), var(--surface-0))",
          border: `1px solid ${THEME.line}`,
          borderTop: `4px solid ${THEME.accent}`,
          borderRadius: "var(--radius-xl)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            alignItems: "center",
          }}
        >
          {/* Main Target & Progress Column */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: THEME.muted,
                marginBottom: 6,
              }}
            >
              <Flame size={15} color={THEME.accent} /> Target FIRE Corpus ({archetype.toUpperCase()} MODEL)
            </div>

            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 4.5vw, 48px)",
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={fireCalc.activeFireNumber} variant="full" />
            </div>

            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 8, fontWeight: 600 }}>
              Eligible Portfolio:{" "}
              <strong style={{ color: THEME.ink }}>
                <Money value={fireCalc.currentNW} variant="full" />
              </strong>{" "}
              (
              <span
                style={{
                  color: fireCalc.progress >= 100 ? THEME.sage : THEME.accent,
                  fontWeight: 800,
                }}
              >
                {animatedProgress.toFixed(1)}% achieved
              </span>
              )
            </div>
          </div>

          {/* Readiness Score & Countdown Column */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 12,
            }}
          >
            {/* FI Readiness Score */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>Readiness</span>
                <Award size={14} color={THEME.accent} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: THEME.ink }}>
                {animatedReadiness.toFixed(0)}/100
              </div>
              <span style={{ fontSize: 10, color: THEME.sage, fontWeight: 700 }}>
                {fireCalc.readinessScore >= 80
                  ? "⭐ Strong Freedom Position"
                  : fireCalc.readinessScore >= 50
                  ? "🚀 Solid Momentum"
                  : "🌱 Early Accumulation"}
              </span>
            </div>

            {/* Target Freedom Date */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>Projected Date</span>
                <Calendar size={14} color={THEME.sage} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                {fireCalc.targetDateFormatted}
              </div>
              <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                {fireCalc.yearsToFIREActual <= 0
                  ? "Achieved!"
                  : `Age ${fireCalc.fireAge.toFixed(1)} (${fireCalc.yearsToFIREActual.toFixed(1)} yrs)`}
              </span>
            </div>

            {/* Monthly Freedom Dividend */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>Freedom Dividend</span>
                <Sparkles size={14} color={THEME.gold} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: THEME.sage }}>
                {fmtINR(fireCalc.monthlyFreedomDividend)}/mo
              </div>
              <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                Covers {fireCalc.freedomDividendCoveragePct.toFixed(0)}% living costs
              </span>
            </div>
          </div>
        </div>

        {/* Milestone Progression Track */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px dashed ${THEME.line}` }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontSize: 11,
              color: THEME.muted,
              fontWeight: 700,
            }}
          >
            <span>Start</span>
            <span>25% Quarter</span>
            <span>50% Semi-FI</span>
            <span>75% Flamingo</span>
            <span>100% Full FIRE</span>
            <span>125% Fat Cushion</span>
          </div>

          <div
            style={{
              height: 12,
              borderRadius: 6,
              background: "var(--t-line)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (fireCalc.progress / 125) * 100)}%`,
                background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.gold} 50%, ${THEME.sage} 100%)`,
                borderRadius: 6,
                transition: "width 0.8s var(--ease-premium)",
              }}
            />
          </div>

          {/* Quick Checkpoint Markers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 8,
              marginTop: 12,
            }}
          >
            {fireCalc.milestones.map((m) => (
              <div
                key={m.pct}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: m.reached
                    ? `color-mix(in srgb, ${THEME.sage} 12%, var(--surface-0))`
                    : "var(--surface-0)",
                  border: `1px solid ${m.reached ? THEME.sage : THEME.line}`,
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {m.reached ? (
                  <CheckCircle2 size={13} color={THEME.sage} />
                ) : (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--t-line)",
                    }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 800, color: m.reached ? THEME.sage : THEME.ink }}>
                    {m.pct}% ({fmtINR(m.corpus)})
                  </div>
                  <div style={{ fontSize: 9, color: THEME.muted }}>
                    {m.reached ? "Reached" : `Needs ${fmtINR(Math.max(0, m.corpus - fireCalc.currentNW))}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Main Tabbed Navigation */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          borderBottom: `1px solid ${THEME.line}`,
          paddingBottom: 8,
          overflowX: "auto",
        }}
      >
        {[
          { id: "cockpit", label: "Cockpit & Milestones", icon: <Flame size={14} /> },
          { id: "studio", label: "Scenario Studio & Archetypes", icon: <Sliders size={14} /> },
          { id: "trajectory", label: "Trajectory & Cashflow Table", icon: <TrendingUp size={14} /> },
          { id: "stress", label: "Stress Testing & SRR", icon: <ShieldAlert size={14} /> },
          { id: "bucket", label: "3-Bucket & Tax-Smart SWP", icon: <Layers size={14} /> },
          { id: "playbook", label: "Acceleration Playbook", icon: <Zap size={14} /> },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: "var(--radius-md)",
                border: active ? `1px solid ${THEME.accent}` : `1px solid ${THEME.line}`,
                background: active
                  ? `color-mix(in srgb, ${THEME.accent} 15%, var(--surface-0))`
                  : "var(--surface-0)",
                color: active ? THEME.accent : THEME.ink,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: COCKPIT & MILESTONES */}
      {activeTab === "cockpit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Key Stat Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <StatCard
              title="Target FI Corpus"
              value={<Money value={fireCalc.activeFireNumber} />}
              subtitle={`${archetype.toUpperCase()} • ${swr}% SWR Rule`}
              icon={<Target size={18} color={THEME.accent} />}
            />
            <StatCard
              title="Current FI Net Worth"
              value={<Money value={fireCalc.currentNW} />}
              subtitle={`${fireCalc.progress.toFixed(1)}% of freedom target`}
              icon={<Wallet size={18} color={THEME.sage} />}
            />
            <StatCard
              title="Monthly Savings Added"
              value={`${fmtINR(monthlySavings)}/mo`}
              subtitle={`+${annualStepUp}% annual step-up`}
              icon={<TrendingUp size={18} color={THEME.gold} />}
            />
            <StatCard
              title="Time to FI"
              value={fireCalc.yearsToFIREActual <= 0 ? "0 yrs" : `${fireCalc.yearsToFIREActual.toFixed(1)} Years`}
              subtitle={`Expected age ${fireCalc.fireAge.toFixed(1)}`}
              icon={<Clock size={18} color={THEME.violet} />}
            />
          </div>

          {/* Asset Class Eligibility Filter Card */}
          <Card style={{ padding: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={16} color={THEME.sage} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  FI Portfolio Asset Eligibility Filter
                </span>
                <Badge variant="neutral" size="sm">
                  Excludes illiquid assets for realistic FI planning
                </Badge>
              </div>
              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                Total Net Worth: <strong style={{ color: THEME.ink }}><Money value={portfolioAssets.totalNetWorth} /></strong>
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              {[
                {
                  id: "eq",
                  label: "Equities & MFs",
                  val: portfolioAssets.equitiesTotal,
                  checked: includeEquities,
                  toggle: () => setIncludeEquities(!includeEquities),
                },
                {
                  id: "fi",
                  label: "Bank, FDs & Bonds",
                  val: portfolioAssets.fixedIncomeTotal,
                  checked: includeFixedIncome,
                  toggle: () => setIncludeFixedIncome(!includeFixedIncome),
                },
                {
                  id: "ret",
                  label: "EPF, PPF & NPS",
                  val: portfolioAssets.retirementTotal,
                  checked: includeRetirement,
                  toggle: () => setIncludeRetirement(!includeRetirement),
                },
                {
                  id: "gold",
                  label: "Gold & SGBs",
                  val: portfolioAssets.goldVal,
                  checked: includeGold,
                  toggle: () => setIncludeGold(!includeGold),
                },
                {
                  id: "re",
                  label: "Real Estate (Inv)",
                  val: portfolioAssets.reVal,
                  checked: includeRealEstate,
                  toggle: () => setIncludeRealEstate(!includeRealEstate),
                },
              ].map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    background: item.checked
                      ? `color-mix(in srgb, ${THEME.sage} 8%, var(--surface-0))`
                      : "var(--surface-0)",
                    border: `1px solid ${item.checked ? THEME.sage : THEME.line}`,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.toggle}
                    style={{ accentColor: THEME.sage }}
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 700, color: THEME.ink }}>{item.label}</span>
                    <span style={{ fontSize: 10, color: THEME.muted }}><Money value={item.val} /></span>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Detailed Milestone Roadmap Breakdown */}
          <Card style={{ padding: 20 }}>
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
              <Activity size={14} color={THEME.accent} /> Comprehensive Financial Independence Roadmap
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {fireCalc.milestones.map((m) => {
                const deficit = Math.max(0, m.corpus - fireCalc.currentNW);
                const progressToMilestone = Math.min(100, (fireCalc.currentNW / m.corpus) * 100);

                return (
                  <div
                    key={m.pct}
                    style={{
                      padding: 14,
                      borderRadius: "var(--radius-lg)",
                      background: m.reached
                        ? `color-mix(in srgb, ${THEME.sage} 10%, var(--surface-0))`
                        : "var(--surface-0)",
                      border: `1px solid ${m.reached ? THEME.sage : THEME.line}`,
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: m.reached ? THEME.sage : "var(--t-line)",
                        color: m.reached ? "#fff" : THEME.muted,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      {m.reached ? <Check size={18} /> : `${m.pct}%`}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                          {m.title}
                        </span>
                        {m.reached && (
                          <Badge variant="success" size="sm">
                            Achieved 🎉
                          </Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{m.desc}</div>

                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: "var(--t-line)",
                          marginTop: 8,
                          overflow: "hidden",
                          maxWidth: 360,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${progressToMilestone}%`,
                            background: m.reached ? THEME.sage : THEME.accent,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                        <Money value={m.corpus} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: m.reached ? THEME.sage : THEME.muted }}>
                        {m.reached ? "100% Funded" : `Need ${fmtINR(deficit)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: SCENARIO STUDIO & ARCHETYPES */}
      {activeTab === "studio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 6 FIRE Archetypes Selector Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                id: "regular",
                label: "Regular FIRE",
                icon: <Flame size={16} color={THEME.accent} />,
                desc: "25x Annual Expenses (100% lifestyle continuation)",
                val: fireCalc.regularFireNumber,
              },
              {
                id: "lean",
                label: "Lean FIRE",
                icon: <Zap size={16} color={THEME.gold} />,
                desc: "20x Core Essential Expenses (~60% minimalist burn)",
                val: fireCalc.leanFireNumber,
              },
              {
                id: "fat",
                label: "Fat FIRE",
                icon: <Gem size={16} color={THEME.violet} />,
                desc: "35x+ Luxury Cushion (~150% burn with travel/health)",
                val: fireCalc.fatFireNumber,
              },
              {
                id: "coast",
                label: "Coast FIRE",
                icon: <Compass size={16} color={THEME.sage} />,
                desc: "Corpus compounds to full target with ₹0 future savings",
                val: fireCalc.coastFireNumber,
              },
              {
                id: "barista",
                label: "Barista FIRE",
                icon: <Coffee size={16} color={THEME.pink} />,
                desc: "Partial passive + active part-time/passion income",
                val: fireCalc.baristaFireNumber,
              },
              {
                id: "flamingo",
                label: "Flamingo FIRE",
                icon: <Sparkles size={16} color={THEME.accent} />,
                desc: "50% accumulated early, coasting to 100% with part-time gig",
                val: fireCalc.flamingoFireNumber,
              },
            ].map((item) => {
              const active = archetype === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setArchetype(item.id as any)}
                  className="card-lift"
                  style={{
                    padding: "14px 16px",
                    borderRadius: "var(--radius-lg)",
                    background: active
                      ? `color-mix(in srgb, ${THEME.accent} 12%, var(--surface-0))`
                      : "var(--surface-0)",
                    border: active ? `2px solid ${THEME.accent}` : `1px solid ${THEME.line}`,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {item.icon}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: active ? THEME.accent : THEME.ink,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: THEME.muted }}>{item.desc}</span>
                  <div style={{ fontSize: 14, fontWeight: 900, color: THEME.ink, marginTop: 4 }}>
                    <Money value={item.val} variant="full" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Coast FIRE Specific Details Banner */}
          {archetype === "coast" && (
            <Card
              style={{
                padding: 16,
                background: `color-mix(in srgb, ${THEME.sage} 10%, var(--surface-0))`,
                border: `1px solid ${THEME.sage}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Compass size={18} color={THEME.sage} />
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Coast FIRE Status Analysis
                </span>
                <Badge variant={fireCalc.isCoastAchieved ? "success" : "neutral"} size="sm">
                  {fireCalc.isCoastAchieved ? "Coast FI Reached! 🚀" : "Coasting in Progress"}
                </Badge>
              </div>
              <p style={{ fontSize: 12, color: THEME.muted, margin: 0 }}>
                {fireCalc.isCoastAchieved
                  ? `Congratulations! Your current portfolio of ${fmtINR(fireCalc.currentNW)} is already above your Coast FIRE threshold of ${fmtINR(fireCalc.coastFireNumber)}. If you stop saving today, your portfolio will compound to ${fmtINR(fireCalc.regularFireNumber)} by Age ${targetAge} at ${returnRate}% CAGR!`
                  : `Your current portfolio of ${fmtINR(fireCalc.currentNW)} needs to reach ${fmtINR(fireCalc.coastFireNumber)} to coast. At your current return rate and savings, you will hit Coast FIRE at Age ${fireCalc.coastAge.toFixed(1)} (${(fireCalc.monthsToCoast / 12).toFixed(1)} years).`}
              </p>
            </Card>
          )}

          {/* Barista FIRE Specific Details & Slider */}
          {archetype === "barista" && (
            <Card
              style={{
                padding: 16,
                background: `color-mix(in srgb, ${THEME.pink} 10%, var(--surface-0))`,
                border: `1px solid ${THEME.pink}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Coffee size={18} color={THEME.pink} />
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Barista FIRE Part-Time / Passion Income Modeling
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: THEME.muted }}>Expected Part-Time Monthly Income</span>
                    <span style={{ color: THEME.pink }}>{fmtINR(baristaIncome)}/mo</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max={monthlyExpense}
                    step="5000"
                    value={baristaIncome}
                    onChange={(e) => setBaristaIncome(Number(e.target.value))}
                    style={{ width: "100%", accentColor: THEME.pink }}
                  />
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  By earning {fmtINR(baristaIncome)}/mo in semi-retirement, your required annual portfolio withdrawal drops from {fmtINR(monthlyExpense * 12)} to {fmtINR(Math.max(0, monthlyExpense - baristaIncome) * 12)}, reducing your required corpus by{" "}
                  <strong style={{ color: THEME.ink }}>
                    {fmtINR(computeFireTarget(baristaIncome * 12, targetAge - currentAge, swr, inflationRate))}
                  </strong>!
                </div>
              </div>
            </Card>
          )}

          {/* Live Parameter Sliders & Presets Studio */}
          <Card style={{ padding: 22 }}>
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
              <Sliders size={14} color={THEME.accent} /> Live Assumptions & Parameter Tuning
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {/* Current Age */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Current Age</span>
                  <span style={{ color: THEME.ink }}>{currentAge} yrs</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="70"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              {/* Target Retirement Age */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Target Retirement Age</span>
                  <span style={{ color: THEME.accent }}>{targetAge} yrs</span>
                </div>
                <input
                  type="range"
                  min={currentAge + 1}
                  max="80"
                  value={targetAge}
                  onChange={(e) => setTargetAge(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              {/* Monthly Living Expense */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Monthly Living Expense</span>
                  <span style={{ color: THEME.ink }}>{fmtINR(monthlyExpense)}</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="500000"
                  step="5000"
                  value={monthlyExpense}
                  onChange={(e) => setMonthlyExpense(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              {/* Monthly Savings Addition */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Monthly Savings Addition</span>
                  <span style={{ color: THEME.sage }}>{fmtINR(monthlySavings)}/mo</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="5000"
                  value={monthlySavings}
                  onChange={(e) => setMonthlySavings(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.sage }}
                />
              </div>

              {/* Annual Step-Up % */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Annual Savings Step-Up</span>
                  <span style={{ color: THEME.gold }}>+{annualStepUp}% / yr</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={annualStepUp}
                  onChange={(e) => setAnnualStepUp(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.gold }}
                />
              </div>

              {/* Safe Withdrawal Rate (SWR) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Safe Withdrawal Rate (SWR)</span>
                  <span style={{ color: THEME.violet }}>{swr}% ({(100 / swr).toFixed(0)}x)</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="5.0"
                  step="0.25"
                  value={swr}
                  onChange={(e) => setSwr(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.violet }}
                />
              </div>

              {/* Pre-Retirement Return */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Pre-Retire Return (CAGR)</span>
                  <span style={{ color: THEME.ink }}>{returnRate}% p.a.</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="18"
                  step="0.5"
                  value={returnRate}
                  onChange={(e) => setReturnRate(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              {/* Post-Retirement Return */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Post-Retire Return (CAGR)</span>
                  <span style={{ color: THEME.ink }}>{postRetireReturn}% p.a.</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="14"
                  step="0.5"
                  value={postRetireReturn}
                  onChange={(e) => setPostRetireReturn(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              {/* Expected Inflation */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Expected Inflation Rate</span>
                  <span style={{ color: THEME.rust }}>{inflationRate}% p.a.</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="0.5"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.rust }}
                />
              </div>

              {/* Life Expectancy */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Life Expectancy</span>
                  <span style={{ color: THEME.ink }}>Age {lifeExpectancy}</span>
                </div>
                <input
                  type="range"
                  min={targetAge + 5}
                  max="100"
                  value={lifeExpectancy}
                  onChange={(e) => setLifeExpectancy(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.ink }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: TRAJECTORY & CASHFLOW TABLE */}
      {activeTab === "trajectory" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Dual-Phase Chart Card */}
          <Card style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TrendingUp size={14} color={THEME.accent} /> Multi-Phase Corpus Forecast
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setChartView("accumulation")}
                  className={`demat-portfolio-pill ${chartView === "accumulation" ? "active" : ""}`}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: chartView === "accumulation" ? THEME.accent : "var(--surface-0)",
                    color: chartView === "accumulation" ? "#fff" : THEME.ink,
                    border: `1px solid ${THEME.line}`,
                    cursor: "pointer",
                  }}
                >
                  Accumulation Growth Phase
                </button>
                <button
                  onClick={() => setChartView("drawdown")}
                  className={`demat-portfolio-pill ${chartView === "drawdown" ? "active" : ""}`}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: chartView === "drawdown" ? THEME.accent : "var(--surface-0)",
                    color: chartView === "drawdown" ? "#fff" : THEME.ink,
                    border: `1px solid ${THEME.line}`,
                    cursor: "pointer",
                  }}
                >
                  Retirement Drawdown Phase
                </button>
              </div>
            </div>

            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartView === "accumulation" ? fireCalc.accumulation : fireCalc.drawdown}
                  margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="corpusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={THEME.accent} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-line)" vertical={false} />
                  <XAxis dataKey="label" stroke={THEME.muted} fontSize={11} />
                  <YAxis
                    stroke={THEME.muted}
                    fontSize={11}
                    tickFormatter={(v) => fmtINR(v)}
                  />
                  <Tooltip
                    formatter={(val: any) => [fmtINRFull(val), "Corpus"]}
                    labelStyle={{ color: THEME.ink, fontWeight: 700 }}
                    contentStyle={{
                      background: "var(--surface-0)",
                      borderColor: THEME.line,
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="corpus"
                    stroke={THEME.accent}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#corpusGrad)"
                  />
                  {chartView === "accumulation" && (
                    <ReferenceLine
                      y={fireCalc.activeFireNumber}
                      label={{
                        value: "FIRE Target",
                        fill: THEME.sage,
                        fontSize: 11,
                        position: "top",
                      }}
                      stroke={THEME.sage}
                      strokeDasharray="4 4"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Year-by-Year Financial Schedule Table */}
          <Card style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FileSpreadsheet size={14} color={THEME.accent} /> Year-by-Year Compounding Ledger
              </div>

              <Button variant="secondary" size="sm" onClick={handleExportCSV} style={{ fontSize: 11 }}>
                <Download size={13} style={{ marginRight: 4 }} /> Download Table (.CSV)
              </Button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.line}`, textAlign: "left", color: THEME.muted }}>
                    <th style={{ padding: "8px 10px" }}>Year</th>
                    <th style={{ padding: "8px 10px" }}>Age</th>
                    <th style={{ padding: "8px 10px" }}>Starting Corpus</th>
                    <th style={{ padding: "8px 10px" }}>Savings Added</th>
                    <th style={{ padding: "8px 10px" }}>Investment Growth</th>
                    <th style={{ padding: "8px 10px" }}>Closing Corpus</th>
                    <th style={{ padding: "8px 10px" }}>Target Required</th>
                    <th style={{ padding: "8px 10px", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fireCalc.tableSchedule.map((row) => (
                    <tr
                      key={row.year}
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        background: row.reached
                          ? `color-mix(in srgb, ${THEME.sage} 6%, transparent)`
                          : "transparent",
                      }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: THEME.ink }}>
                        {row.year}
                      </td>
                      <td style={{ padding: "8px 10px", color: THEME.muted }}>{row.age}</td>
                      <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums" }}>
                        <Money value={row.startCorpus} />
                      </td>
                      <td style={{ padding: "8px 10px", color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                        +{fmtINR(row.savingsAdded)}
                      </td>
                      <td style={{ padding: "8px 10px", color: THEME.gold, fontVariantNumeric: "tabular-nums" }}>
                        +{fmtINR(row.returnsGenerated)}
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 800, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={row.closingCorpus} />
                      </td>
                      <td style={{ padding: "8px 10px", color: THEME.muted, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={row.fireTarget} />
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        {row.reached ? (
                          <Badge variant="success" size="sm">
                            FI Reached 🎯
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Accumulating
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: STRESS TESTING & SRR */}
      {activeTab === "stress" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card
            style={{
              padding: 20,
              background: `color-mix(in srgb, ${THEME.rust} 8%, var(--surface-0))`,
              border: `1px solid ${THEME.rust}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ShieldAlert size={18} color={THEME.rust} />
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                Portfolio Stress-Testing & Longevity Engine
              </span>
            </div>
            <p style={{ fontSize: 12, color: THEME.muted, margin: 0 }}>
              Standard retirement calculators assume smooth average returns every year. In reality, market crashes, hyper-inflation, and extended longevity pose existential threats known as **Sequence of Returns Risk (SRR)**. Below we stress-test your FIRE plan against historical black-swan events.
            </p>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {/* Scenario 1: SRR Crash */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <TrendingDown size={16} color={THEME.rust} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Early Retirement Bear Market (-20% in Y1-2)
                </span>
              </div>
              <p style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                A deep market downturn during the initial 2 years of retirement forcing withdrawals from a declining corpus.
              </p>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Portfolio Lasts Till:</span>
                  <strong style={{ color: fireCalc.stress.srrDepletedAge > lifeExpectancy ? THEME.sage : THEME.rust }}>
                    Age {fireCalc.stress.srrDepletedAge}
                  </strong>
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>
                  {fireCalc.stress.srrDepletedAge >= lifeExpectancy
                    ? "✅ Portfolio successfully survives life expectancy!"
                    : "⚠️ Warning: Portfolio depletes early under early bear market."}
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
                💡 Shield: Implement 2-Year Cash Bucket (Bucket 1) to avoid selling equities during a crash.
              </div>
            </Card>

            {/* Scenario 2: Hyper-Inflation Spike */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Activity size={16} color={THEME.gold} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Sustained High Inflation Shock (8.5% p.a.)
                </span>
              </div>
              <p style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                Inflation remains stubbornly elevated at 8.5% instead of your base assumption of {inflationRate}%, doubling living expenses every 8.5 years.
              </p>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Portfolio Lasts Till:</span>
                  <strong style={{ color: fireCalc.stress.hiDepletedAge > lifeExpectancy ? THEME.sage : THEME.gold }}>
                    Age {fireCalc.stress.hiDepletedAge}
                  </strong>
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>
                  {fireCalc.stress.hiDepletedAge >= lifeExpectancy
                    ? "✅ Portfolio comfortably sustains 8.5% inflation!"
                    : "⚠️ High inflation requires dynamic withdrawal reduction."}
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
                💡 Shield: Maintain 60%+ equity index allocation in Bucket 3 to beat real inflation.
              </div>
            </Card>

            {/* Scenario 3: Longevity Extension */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <ShieldCheck size={16} color={THEME.violet} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Extended Longevity (Centenarian Living to Age 100)
                </span>
              </div>
              <p style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                Living beyond target life expectancy to age 100 with ongoing medical and care expenses.
              </p>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: THEME.muted }}>Total Retirement Span:</span>
                  <strong style={{ color: THEME.ink }}>{100 - targetAge} Years</strong>
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>
                  Requires Safe Withdrawal Rate (SWR) under 3.5% for 100% perpetual survival.
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
                💡 Shield: Use Guyton-Klinger Guardrails (freeze inflation adjustment in down years).
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: 3-BUCKET & TAX-SMART SWP */}
      {activeTab === "bucket" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 3-Bucket Visualizer Card */}
          <Card style={{ padding: 22 }}>
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
              <Layers size={14} color={THEME.accent} /> Indian 3-Bucket Retirement Withdrawal Architecture
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {/* Bucket 1 */}
              <div
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  background: `color-mix(in srgb, ${THEME.sage} 10%, var(--surface-0))`,
                  border: `1px solid ${THEME.sage}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                    Bucket 1: Immediate Cash (1-3 Yrs)
                  </span>
                  <Badge variant="success" size="sm">Zero Volatility</Badge>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                  <Money value={fireCalc.buckets.bucket1} variant="full" />
                </div>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  <strong>Instruments:</strong> Liquid MFs, Ultra Short Debt, High-Yield Savings, FDs
                </div>
                <div style={{ fontSize: 11, color: THEME.ink }}>
                  Funds daily living expenses for the next 2.5–3 years. Never sell equity in a downturn!
                </div>
              </div>

              {/* Bucket 2 */}
              <div
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  background: `color-mix(in srgb, ${THEME.gold} 10%, var(--surface-0))`,
                  border: `1px solid ${THEME.gold}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.gold }}>
                    Bucket 2: Stability & Income (4-7 Yrs)
                  </span>
                  <Badge variant="neutral" size="sm">Moderate Growth</Badge>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                  <Money value={fireCalc.buckets.bucket2} variant="full" />
                </div>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  <strong>Instruments:</strong> Conservative Hybrid, Multi-Asset Funds, Corporate Bonds, SGBs
                </div>
                <div style={{ fontSize: 11, color: THEME.ink }}>
                  Generates inflation-hedged yields to periodically replenish Bucket 1.
                </div>
              </div>

              {/* Bucket 3 */}
              <div
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  background: `color-mix(in srgb, ${THEME.accent} 10%, var(--surface-0))`,
                  border: `1px solid ${THEME.accent}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.accent }}>
                    Bucket 3: Growth Engine (8+ Yrs)
                  </span>
                  <Badge variant="accent" size="sm">High Compounding</Badge>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                  <Money value={fireCalc.buckets.bucket3} variant="full" />
                </div>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  <strong>Instruments:</strong> Nifty 50 Index, Flexi-Cap MFs, Mid-Cap, International Equities
                </div>
                <div style={{ fontSize: 11, color: THEME.ink }}>
                  Uninterrupted 12%+ compounding engine. Refills Bucket 2 during bull runs.
                </div>
              </div>
            </div>
          </Card>

          {/* Tax-Optimized SWP Guide in India */}
          <Card style={{ padding: 20 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: THEME.muted,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Percent size={14} color={THEME.sage} /> Indian Tax-Efficiency Guide: SWP vs Dividends vs FDs
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <div style={{ padding: 12, borderRadius: 8, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                <div style={{ fontWeight: 800, color: THEME.sage, fontSize: 13, marginBottom: 4 }}>
                  1. Systematic Withdrawal Plan (SWP)
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                  Only the capital gains portion of each monthly withdrawal is taxed! Equity LTCG is taxed at 12.5% with the first **₹1.25 Lakh profit per financial year completely TAX-FREE** under Sec 112A.
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                <div style={{ fontWeight: 800, color: THEME.rust, fontSize: 13, marginBottom: 4 }}>
                  2. Avoid Fixed Deposit Interest Income
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                  FD interest is fully taxed at your peak marginal income slab rate (up to 39% with surcharge/cess), eroding real compounding.
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                <div style={{ fontWeight: 800, color: THEME.violet, fontSize: 13, marginBottom: 4 }}>
                  3. Tax Gain Harvesting Strategy
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                  Every March, systematically redeem and reinvest up to ₹1.25L in equity LTCG to reset your purchase price without paying zero tax!
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: ACCELERATION PLAYBOOK */}
      {activeTab === "playbook" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card
            style={{
              padding: 20,
              background: `color-mix(in srgb, ${THEME.accent} 8%, var(--surface-0))`,
              border: `1px solid ${THEME.accent}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Zap size={18} color={THEME.accent} />
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                FIRE Acceleration Levers: Shave Off Years from Your Target
              </span>
            </div>
            <p style={{ fontSize: 12, color: THEME.muted, margin: 0 }}>
              Small optimization levers in monthly cash flow, expense trimming, and secondary income have exponential compounding impacts on your retirement timeline.
            </p>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {/* Lever 1: Increase SIP by 10k */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <TrendingUp size={16} color={THEME.sage} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Increase Monthly SIP by +₹10,000
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: THEME.sage, margin: "8px 0" }}>
                -{fireCalc.acceleration.yearsSaved10kSip.toFixed(1)} Years
              </div>
              <p style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                Adding ₹10,000/month to your current investments accelerates your compounding and reaches FIRE {fireCalc.acceleration.yearsSaved10kSip.toFixed(1)} years sooner!
              </p>
            </Card>

            {/* Lever 2: Cut Expense by 5k */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Coins size={16} color={THEME.gold} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Trim Discretionary Expenses by ₹5,000/mo
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: THEME.gold, margin: "8px 0" }}>
                -{fireCalc.acceleration.yearsSavedCut5k.toFixed(1)} Years
              </div>
              <p style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                Trimming ₹5,000/mo has a double multiplier: it directly increases monthly savings by ₹5,000 AND lowers your lifetime required target corpus by{" "}
                <strong>{fmtINR(computeFireTarget(5000 * 12, targetAge - currentAge, swr, inflationRate))}</strong>!
              </p>
            </Card>

            {/* Lever 3: Rental / Passive Income */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Building2 size={16} color={THEME.violet} />
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Add Secondary Rental/Side-Income of ₹20,000/mo
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: THEME.violet, margin: "8px 0" }}>
                -{fireCalc.acceleration.yearsSavedRental20k.toFixed(1)} Years
              </div>
              <p style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                A reliable secondary passive income stream of ₹20,000/mo reduces your required FIRE portfolio by{" "}
                <strong>{fmtINR(computeFireTarget(20000 * 12, targetAge - currentAge, swr, inflationRate))}</strong>.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
