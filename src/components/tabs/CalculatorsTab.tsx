// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calculator,
  TrendingUp,
  Clock,
  Briefcase,
  BarChart2,
  Flame,
  Shield,
  ArrowRightLeft,
  Coins,
  Wallet,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  GitBranch,
  Plus,
  Trash2,
  CalendarDays,
  Lightbulb,
  TrendingDown,
  Lock,
  HeartPulse,
  AlertCircle,
  Crown,
  Plane,
  Rocket,
  Home,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fdMaturity, rdMaturity } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Prv } from "../../context/PrivacyContext";

interface CalculatorsTabProps {
  metrics: any;
  state: any;
}

export const CalculatorsTab: React.FC<CalculatorsTabProps> = ({ metrics, state }) => {
  const [calcTab, setCalcTab] = useState<
    | "emi"
    | "sip"
    | "step-sip"
    | "swp"
    | "cagr"
    | "fire"
    | "fdrd"
    | "loan-invest"
    | "projection"
    | "stress"
    | "monte-carlo"
    | "scenario-sandbox"
    | "indexation"
    | "retirement-income"
  >("emi");
  const [monteVolatility, setMonteVolatility] = useState("10");

  // ── Scenario Sandbox State ──
  const [sandboxSavings, setSandboxSavings] = useState("50000");
  const [sandboxReturn, setSandboxReturn] = useState("12");
  const [sandboxYears, setSandboxYears] = useState("15");

  // Sabbatical Scenario
  const [sabActive, setSabActive] = useState(false);
  const [sabAge, setSabAge] = useState("35");
  const [sabDur, setSabDur] = useState("2");
  const [sabInc, setSabInc] = useState("0");
  const [sabExp, setSabExp] = useState("20000");

  // Startup Venture Scenario
  const [startupActive, setStartupActive] = useState(false);
  const [startupAge, setStartupAge] = useState("37");
  const [startupCapEx, setStartupCapEx] = useState("500000");
  const [startupLoss, setStartupLoss] = useState("3");
  const [startupPayoutAge, setStartupPayoutAge] = useState("42");
  const [startupPayout, setStartupPayout] = useState("2500000");

  // Property Purchase Scenario
  const [propActive, setPropActive] = useState(false);
  const [propAge, setPropAge] = useState("40");
  const [propDown, setPropDown] = useState("1500000");
  const [propCarry, setPropCarry] = useState("60000");

  // ── 1. EMI CALCULATOR STATE & LOGIC ──
  const [emiP, setEmiP] = useState("1000000");
  const [emiR, setEmiR] = useState("8.5");
  const [emiN, setEmiN] = useState("240");

  const emiResult = useMemo(() => {
    const p = Math.max(0, Number(emiP) || 0);
    const r = Math.max(0, (Number(emiR) || 0) / 12 / 100);
    const n = Math.max(1, Number(emiN) || 1);

    if (r === 0) return { emi: p / n, total: p, interest: 0 };
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return {
      emi: isNaN(emi) ? 0 : emi,
      total: isNaN(emi) ? p : emi * n,
      interest: isNaN(emi) ? 0 : emi * n - p,
    };
  }, [emiP, emiR, emiN]);

  const emiPieData = useMemo(() => {
    return [
      { name: "Principal Amount", value: Math.max(0, Number(emiP) || 0), color: THEME.accent },
      { name: "Total Interest", value: Math.max(0, emiResult.interest), color: THEME.gold },
    ];
  }, [emiP, emiResult.interest]);

  // ── 2. SIP RETURNS STATE & LOGIC ──
  const [sipAmt, setSipAmt] = useState("10000");
  const [sipYrs, setSipYrs] = useState("10");
  const [sipRate, setSipRate] = useState("12");

  const sipResult = useMemo(() => {
    const m = Math.max(0, Number(sipAmt) || 0);
    const y = Math.max(0.1, Number(sipYrs) || 1);
    const r = Math.max(0, (Number(sipRate) || 0) / 12 / 100);
    const n = Math.round(y * 12);

    const corpus = r === 0 ? m * n : ((m * (Math.pow(1 + r, n) - 1)) / r) * (1 + r);
    return {
      corpus: isNaN(corpus) ? m * n : corpus,
      invested: m * n,
      gains: isNaN(corpus) ? 0 : Math.max(0, corpus - m * n),
    };
  }, [sipAmt, sipYrs, sipRate]);

  const sipPieData = useMemo(() => {
    return [
      { name: "Total Invested", value: sipResult.invested, color: THEME.muted },
      { name: "Compounded Gains", value: sipResult.gains, color: THEME.sage },
    ];
  }, [sipResult]);

  // ── 2b. STEP-UP SIP STATE & LOGIC ──
  const [stepSipAmt, setStepSipAmt] = useState("10000");
  const [stepSipStep, setStepSipStep] = useState("10"); // % annual step-up
  const [stepSipYrs, setStepSipYrs] = useState("10");
  const [stepSipRate, setStepSipRate] = useState("12");

  const stepSipResult = useMemo(() => {
    const m0 = Math.max(0, Number(stepSipAmt) || 0);
    const stepPct = Math.max(0, Number(stepSipStep) || 0) / 100;
    const years = Math.max(1, Number(stepSipYrs) || 1);
    const r = Math.max(0, (Number(stepSipRate) || 0) / 12 / 100);

    let corpus = 0;
    let invested = 0;
    const yearlyData: { year: number; corpus: number; invested: number }[] = [];

    for (let y = 0; y < years; y++) {
      const monthly = m0 * Math.pow(1 + stepPct, y);
      const monthsRemaining = (years - y) * 12;
      // FV of this year's SIP tranche (annuity due) at the end of full tenure
      const trancheFV =
        r === 0
          ? monthly * 12 // zero-return: FV = invested amount only
          : monthly *
            ((Math.pow(1 + r, 12) - 1) / r) *
            (1 + r) *
            Math.pow(1 + r, (years - y - 1) * 12);
      corpus += trancheFV;
      invested += monthly * 12;
      yearlyData.push({ year: y + 1, corpus: Math.round(corpus), invested: Math.round(invested) });
    }

    // Compare with flat SIP (same starting amount, no step-up)
    const flatN = years * 12;
    const flatCorpus = r === 0 ? m0 * flatN : m0 * ((Math.pow(1 + r, flatN) - 1) / r) * (1 + r);
    const flatInvested = m0 * flatN;

    return {
      corpus: Math.round(corpus),
      invested: Math.round(invested),
      gains: Math.round(Math.max(0, corpus - invested)),
      flatCorpus: Math.round(flatCorpus),
      flatInvested: Math.round(flatInvested),
      extraGains: Math.round(Math.max(0, corpus - flatCorpus)),
      yearlyData,
    };
  }, [stepSipAmt, stepSipStep, stepSipYrs, stepSipRate]);

  // ── 2c. SWP (SYSTEMATIC WITHDRAWAL PLAN) STATE & LOGIC ──
  const [swpCorpus, setSwpCorpus] = useState(() =>
    String(Math.round((metrics?.netWorth || 5000000) / 100000) * 100000)
  );
  const [swpWithdrawal, setSwpWithdrawal] = useState("30000");
  const [swpRate, setSwpRate] = useState("8");
  const [swpYears, setSwpYears] = useState("20");

  const swpResult = useMemo(() => {
    const corpus0 = Math.max(0, Number(swpCorpus) || 0);
    const monthly = Math.max(0, Number(swpWithdrawal) || 0);
    const r = Math.max(0, (Number(swpRate) || 0) / 12 / 100);
    const years = Math.max(1, Number(swpYears) || 1);
    const n = years * 12;

    let balance = corpus0;
    let totalWithdrawn = 0;
    let depletionMonth = -1;
    const yearlyData: { year: number; balance: number; withdrawn: number }[] = [];

    for (let m = 1; m <= n; m++) {
      // Apply monthly return first, then withdraw (standard SWP convention)
      balance = balance * (1 + r);
      const actualWithdrawal = Math.min(monthly, balance);
      balance -= actualWithdrawal;
      totalWithdrawn += actualWithdrawal;

      if (balance <= 0 && depletionMonth === -1 && monthly > 0) {
        depletionMonth = m;
        balance = 0;
      }

      if (m % 12 === 0) {
        yearlyData.push({
          year: m / 12,
          balance: Math.max(0, Math.round(balance)),
          withdrawn: Math.round(totalWithdrawn),
        });
      }
    }

    const monthlyInterest = corpus0 * r;
    const isSustainable = r > 0 && monthlyInterest >= monthly;
    // PV of annuity: min corpus needed so balance reaches exactly 0 after N months
    const minCorpus = r === 0 ? monthly * n : (monthly * (1 - Math.pow(1 + r, -n))) / r;
    // Corpus needed to withdraw this amount forever (perpetuity)
    const perpetuityCorpus = r > 0 ? Math.round(monthly / r) : null;

    return {
      remainingCorpus: Math.max(0, Math.round(balance)),
      totalWithdrawn: Math.round(totalWithdrawn),
      depletionMonth,
      isSustainable,
      monthlyInterest: Math.round(monthlyInterest),
      minCorpus: Math.round(minCorpus),
      perpetuityCorpus,
      yearlyData,
      deficit: Math.max(0, Math.round(minCorpus - corpus0)),
      surplus: Math.max(0, Math.round(corpus0 - minCorpus)),
    };
  }, [swpCorpus, swpWithdrawal, swpRate, swpYears]);

  // ── 3. CAGR CALCULATOR STATE & LOGIC ──
  const [cagrInvested, setCagrInvested] = useState("100000");
  const [cagrCurrent, setCagrCurrent] = useState("200000");
  const [cagrYears, setCagrYears] = useState("5");

  const cagrResult = useMemo(() => {
    const inv = Math.max(0, Number(cagrInvested) || 0);
    const curr = Math.max(0, Number(cagrCurrent) || 0);
    const yrs = Math.max(0.01, Number(cagrYears) || 0);
    if (inv <= 0 || curr <= 0 || yrs <= 0) return { cagr: null, absoluteReturn: 0, absolutePct: 0 };
    const cagr = (Math.pow(curr / inv, 1 / yrs) - 1) * 100;
    return {
      cagr: isNaN(cagr) ? null : cagr,
      absoluteReturn: curr - inv,
      absolutePct: ((curr - inv) / inv) * 100,
    };
  }, [cagrInvested, cagrCurrent, cagrYears]);

  // ── 4. FIRE RETIREMENT STATE & LOGIC ──
  const [fireAge, setFireAge] = useState("30");
  const [fireRetireAge, setFireRetireAge] = useState("55");
  const [fireExpense, setFireExpense] = useState("50000");
  const [firePortfolio, setFirePortfolio] = useState(() => String(metrics?.netWorth || 1000000));
  const [fireSavings, setFireSavings] = useState("30000");
  const [fireInflation, setFireInflation] = useState("6");
  const [firePreReturn, setFirePreReturn] = useState("12");
  const [firePostReturn, setFirePostReturn] = useState("8");
  const [fireLifeExp, setFireLifeExp] = useState("85");

  /* ══════════════════════════════════════════════════════════════════════
     MONTE CARLO RETIREMENT SIMULATOR (RELEASE 5)
     ══════════════════════════════════════════════════════════════════════ */
  const monteCarloResult = useMemo(() => {
    if (calcTab !== "monte-carlo") return null;

    const startAge = Number(fireRetireAge) || 55;
    const endAge = Number(fireLifeExp) || 85;
    const yrsInRet = Math.max(1, endAge - startAge);

    const initialCorpus = Number(firePortfolio) || Number(metrics?.netWorth) || 1000000;
    const startMonthlyExpense = Number(fireExpense) || 50000;
    const annualInflation = (Number(fireInflation) || 6) / 100;
    const avgPostReturn = (Number(firePostReturn) || 8) / 100;
    const portfolioVol = (Number(monteVolatility) || 10) / 100;

    const numSimulations = 500;
    const years = yrsInRet;

    const balances: number[][] = Array.from({ length: years + 1 }, () => []);

    for (let s = 0; s < numSimulations; s++) {
      balances[0].push(initialCorpus);
    }

    let successCount = 0;

    const getGaussianRandom = () => {
      let u = 0,
        v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    for (let s = 0; s < numSimulations; s++) {
      let corpus = initialCorpus;
      let monthlyExpense = startMonthlyExpense;

      for (let y = 1; y <= years; y++) {
        monthlyExpense = monthlyExpense * (1 + annualInflation);
        const annualExpense = monthlyExpense * 12;

        if (corpus > 0) {
          const normalRand = getGaussianRandom();
          const annualReturn = avgPostReturn + portfolioVol * normalRand;
          corpus = Math.max(0, (corpus - annualExpense) * (1 + annualReturn));
        } else {
          corpus = 0;
        }

        balances[y].push(corpus);
      }

      if (corpus > 0) {
        successCount++;
      }
    }

    const successProbability = (successCount / numSimulations) * 100;

    const chartData = [];
    for (let y = 0; y <= years; y++) {
      const yearBalances = [...balances[y]];
      yearBalances.sort((a, b) => a - b);

      const p10Idx = Math.floor(numSimulations * 0.1);
      const p50Idx = Math.floor(numSimulations * 0.5);
      const p90Idx = Math.floor(numSimulations * 0.9);

      chartData.push({
        year: startAge + y,
        "Worst Case (10th %)": Math.round(yearBalances[p10Idx]),
        "Expected Case (50th %)": Math.round(yearBalances[p50Idx]),
        "Best Case (90th %)": Math.round(yearBalances[p90Idx]),
      });
    }

    let totalYearsLasted = 0;
    for (let s = 0; s < numSimulations; s++) {
      let zeroYear = years;
      for (let y = 0; y <= years; y++) {
        if (balances[y][s] <= 0) {
          zeroYear = y;
          break;
        }
      }
      totalYearsLasted += zeroYear;
    }
    const avgYearsLasted = totalYearsLasted / numSimulations;

    return {
      successProbability,
      avgYearsLasted,
      chartData,
      yrsInRet,
    };
  }, [
    calcTab,
    fireRetireAge,
    fireLifeExp,
    firePortfolio,
    fireExpense,
    fireInflation,
    firePostReturn,
    monteVolatility,
    metrics?.netWorth,
  ]);

  /* ══════════════════════════════════════════════════════════════════════
     EXECUTIVE WEALTH SCENARIO PLANNER & LIFESTYLE SANDBOX (RELEASE 6)
     ══════════════════════════════════════════════════════════════════════ */
  const sandboxResult = useMemo(() => {
    if (calcTab !== "scenario-sandbox") return null;

    const startAge = Number(fireAge) || 30;
    const years = Math.max(5, Math.min(40, Number(sandboxYears) || 15));
    const expectedReturn = (Number(sandboxReturn) || 12) / 100;
    const baseSavings = Number(sandboxSavings) || 50000;
    const initialWealth = Number(firePortfolio) || Number(metrics?.netWorth) || 1000000;

    // Sabbatical
    const sActive = sabActive;
    const sAge = Number(sabAge) || 35;
    const sDur = Number(sabDur) || 2;
    const sIncPct = (Number(sabInc) || 0) / 100;
    const sExpExtra = Number(sabExp) || 20000;

    // Startup Venture
    const stActive = startupActive;
    const stAge = Number(startupAge) || 37;
    const stCapEx = Number(startupCapEx) || 500000;
    const stLossYrs = Number(startupLoss) || 3;
    const stPayoutAge = Number(startupPayoutAge) || 42;
    const stPayout = Number(startupPayout) || 2500000;

    // Property Purchase
    const pActiveVal = propActive;
    const pAge = Number(propAge) || 40;
    const pDownPay = Number(propDown) || 1500000;
    const pCarryCost = Number(propCarry) || 60000;

    const chartData = [];
    let baseWealth = initialWealth;
    let sandWealth = initialWealth;
    let liquidityCrisisYear = -1;

    chartData.push({
      year: 0,
      age: startAge,
      "Baseline Path": Math.round(baseWealth),
      "Simulated Path": Math.round(sandWealth),
    });

    for (let t = 1; t <= years; t++) {
      const curAge = startAge + t;

      // 1. BASELINE CALCULATIONS
      const annualBaseSavings = baseSavings * 12;
      baseWealth = baseWealth * (1 + expectedReturn) + annualBaseSavings;

      // 2. SANDBOX CALCULATIONS
      let yearlySandSavings = baseSavings * 12;
      let oneTimeOutflows = 0;
      let oneTimeInflows = 0;

      // Check Sabbatical
      if (sActive && curAge >= sAge && curAge < sAge + sDur) {
        const monthlySandSavings = baseSavings * sIncPct - sExpExtra;
        yearlySandSavings = monthlySandSavings * 12;
      }

      // Check Startup Venture
      if (stActive) {
        if (curAge >= stAge && curAge < stAge + stLossYrs) {
          yearlySandSavings = 0;
        }
        if (curAge === stAge) {
          oneTimeOutflows += stCapEx;
        }
        if (curAge === stPayoutAge) {
          oneTimeInflows += stPayout;
        }
      }

      // Check Property Purchase
      if (pActiveVal) {
        if (curAge === pAge) {
          oneTimeOutflows += pDownPay;
        }
        if (curAge >= pAge) {
          yearlySandSavings -= pCarryCost * 12;
        }
      }

      // Compound Sandbox Wealth
      sandWealth =
        (sandWealth - oneTimeOutflows) * (1 + expectedReturn) + yearlySandSavings + oneTimeInflows;
      if (sandWealth < 0) {
        sandWealth = 0;
        if (liquidityCrisisYear === -1) {
          liquidityCrisisYear = curAge;
        }
      }

      chartData.push({
        year: t,
        age: curAge,
        "Baseline Path": Math.round(baseWealth),
        "Simulated Path": Math.round(sandWealth),
      });
    }

    const endBase = baseWealth;
    const endSand = sandWealth;
    const oppCostVal = endBase - endSand;

    const targetCorpus = Number(firePortfolio) || 15000000;

    const getYearsToTarget = (startNW, annualSave, target) => {
      if (startNW >= target) return 0;
      let cw = startNW;
      for (let y = 1; y <= 50; y++) {
        cw = cw * (1 + expectedReturn) + annualSave;
        if (cw >= target) return y;
      }
      return 50;
    };

    const baseYearsNeeded = getYearsToTarget(initialWealth, baseSavings * 12, targetCorpus);
    const baseFIAge = startAge + baseYearsNeeded;

    let sandYearsNeeded = baseYearsNeeded;
    if (endSand < targetCorpus) {
      let cw = endSand;
      let extraY = 0;
      for (let y = 1; y <= 50; y++) {
        cw = cw * (1 + expectedReturn) + baseSavings * 12;
        if (cw >= targetCorpus) {
          extraY = y;
          break;
        }
      }
      sandYearsNeeded = years + extraY;
    } else {
      for (let i = 0; i < chartData.length; i++) {
        if (chartData[i]["Simulated Path"] >= targetCorpus) {
          sandYearsNeeded = chartData[i].year;
          break;
        }
      }
    }
    const sandFIAge = startAge + sandYearsNeeded;

    return {
      chartData,
      oppCost: oppCostVal,
      endBase,
      endSand,
      liquidityCrisisAge: liquidityCrisisYear,
      baseFIAge,
      sandFIAge,
      fiAgeGap: sandFIAge - baseFIAge,
    };
  }, [
    calcTab,
    fireAge,
    sandboxSavings,
    sandboxReturn,
    sandboxYears,
    firePortfolio,
    metrics?.netWorth,
    sabActive,
    sabAge,
    sabDur,
    sabInc,
    sabExp,
    startupActive,
    startupAge,
    startupCapEx,
    startupLoss,
    startupPayoutAge,
    startupPayout,
    propActive,
    propAge,
    propDown,
    propCarry,
  ]);

  const fireResult = useMemo(() => {
    const curAge = Math.max(1, Number(fireAge) || 30);
    const retAge = Math.max(curAge + 1, Number(fireRetireAge) || 55);
    const monthlyExp = Math.max(0, Number(fireExpense) || 0);
    const curPort = Math.max(0, Number(firePortfolio) || 0);
    const mSavings = Math.max(0, Number(fireSavings) || 0);
    const infl = Math.max(0, Number(fireInflation) || 6) / 100;
    const preRet = Math.max(0, Number(firePreReturn) || 12) / 100;
    const postRet = Math.max(0, Number(firePostReturn) || 8) / 100;
    const lifeExp = Math.max(retAge + 1, Number(fireLifeExp) || 85);

    const yrsToRet = retAge - curAge;
    const yrsInRet = lifeExp - retAge;

    // Inflation adjusted monthly/annual expenses at retirement
    const retMonthlyExp = monthlyExp * Math.pow(1 + infl, yrsToRet);
    const retAnnualExp = retMonthlyExp * 12;

    // Post-retirement inflation-adjusted return rate (Real Return Rate)
    const realPostReturn = (1 + postRet) / (1 + infl) - 1;

    // Calculate required retirement corpus using inflation-adjusted annuity formula
    let reqCorpus = 0;
    if (realPostReturn === 0) {
      reqCorpus = retAnnualExp * yrsInRet;
    } else {
      reqCorpus = retAnnualExp * ((1 - Math.pow(1 + realPostReturn, -yrsInRet)) / realPostReturn);
    }

    // Future value of current savings at retirement
    const fvCurrent = curPort * Math.pow(1 + preRet, yrsToRet);

    // Future value of monthly savings at retirement (compounded monthly)
    const monthlyPreRate = preRet / 12;
    const monthsToRet = yrsToRet * 12;
    let fvSavings = 0;
    if (monthlyPreRate === 0) {
      fvSavings = mSavings * monthsToRet;
    } else {
      fvSavings =
        mSavings *
        ((Math.pow(1 + monthlyPreRate, monthsToRet) - 1) / monthlyPreRate) *
        (1 + monthlyPreRate);
    }

    const projectedCorpus = fvCurrent + fvSavings;
    const gap = reqCorpus - projectedCorpus;
    const percentOnTrack =
      reqCorpus > 0 ? Math.min(100, Math.round((projectedCorpus / reqCorpus) * 100)) : 0;
    const safeWithdrawalRate = reqCorpus > 0 ? (retAnnualExp / reqCorpus) * 100 : 4;

    // Current runway: how long current portfolio lasts without further savings
    const currentRunwayMonths = monthlyExp > 0 ? Math.round(curPort / monthlyExp) : Infinity;
    const currentRunwayYears = Math.round((currentRunwayMonths / 12) * 10) / 10;

    // Projected FIRE date: find the year when cumulative corpus >= reqCorpus
    let projectedFireYear: number | null = null;
    let tempCorpus = curPort;
    for (let y = 1; y <= 60; y++) {
      tempCorpus = tempCorpus * (1 + preRet) + mSavings * 12;
      const yrsRemainingAtY = Math.max(0, lifeExp - curAge - y);
      const inflAdjReq =
        realPostReturn === 0
          ? retAnnualExp * yrsRemainingAtY
          : retAnnualExp * ((1 - Math.pow(1 + realPostReturn, -yrsRemainingAtY)) / realPostReturn);
      if (tempCorpus >= inflAdjReq && inflAdjReq > 0) {
        projectedFireYear = new Date().getFullYear() + y;
        break;
      }
    }

    // Monthly savings needed to close the gap
    let monthlySavingsNeeded = 0;
    if (gap > 0 && monthlyPreRate > 0 && monthsToRet > 0) {
      const fvFactor =
        ((Math.pow(1 + monthlyPreRate, monthsToRet) - 1) / monthlyPreRate) * (1 + monthlyPreRate);
      monthlySavingsNeeded = Math.round(gap / fvFactor);
    }

    // 4% Rule status
    const fourPctCorpus = retAnnualExp / 0.04;
    const fourPctProgress =
      fourPctCorpus > 0 ? Math.min(100, Math.round((projectedCorpus / fourPctCorpus) * 100)) : 0;

    return {
      retMonthlyExp,
      retAnnualExp,
      reqCorpus,
      projectedCorpus,
      gap,
      percentOnTrack,
      safeWithdrawalRate,
      yrsToRet,
      yrsInRet,
      realPostReturn,
      infl,
      postRet,
      currentRunwayMonths,
      currentRunwayYears,
      projectedFireYear,
      monthlySavingsNeeded,
      fourPctCorpus,
      fourPctProgress,
    };
  }, [
    fireAge,
    fireRetireAge,
    fireExpense,
    firePortfolio,
    fireSavings,
    fireInflation,
    firePreReturn,
    firePostReturn,
    fireLifeExp,
  ]);

  // ── 5. FD & RD MATURITY STATE & LOGIC ──
  const [fdrdType, setFdrdType] = useState<"fd" | "rd">("fd");
  const [fdAmt, setFdAmt] = useState("100000");
  const [fdRate, setFdRate] = useState("7.1");
  const [fdYrs, setFdYrs] = useState("5");
  const [fdComp, setFdComp] = useState("4"); // Quarterly default

  const [rdAmt, setRdAmt] = useState("5000");
  const [rdRate, setRdRate] = useState("6.8");
  const [rdMonths, setRdMonths] = useState("36");

  const fdrdResult = useMemo(() => {
    if (fdrdType === "fd") {
      const p = Math.max(0, Number(fdAmt) || 0);
      const r = Math.max(0, Number(fdRate) || 0);
      const y = Math.max(0, Number(fdYrs) || 0);
      const freq = Number(fdComp) || 4;
      const maturity = fdMaturity(p, r, y, freq);
      return {
        invested: p,
        maturity,
        interest: Math.max(0, maturity - p),
      };
    } else {
      const m = Math.max(0, Number(rdAmt) || 0);
      const r = Math.max(0, Number(rdRate) || 0);
      const mos = Math.max(0, Number(rdMonths) || 0);
      const maturity = rdMaturity(m, r, mos);
      return {
        invested: m * mos,
        maturity,
        interest: Math.max(0, maturity - m * mos),
      };
    }
  }, [fdrdType, fdAmt, fdRate, fdYrs, fdComp, rdAmt, rdRate, rdMonths]);

  const fdrdPieData = useMemo(() => {
    return [
      { name: "Principal Invested", value: fdrdResult.invested, color: THEME.accent },
      { name: "Interest Earned", value: fdrdResult.interest, color: THEME.sage },
    ];
  }, [fdrdResult]);

  // ── INDEXATION BENEFIT CALCULATOR STATE & LOGIC ──
  const CII_TABLE: Record<string, number> = {
    "2001-02": 100,
    "2002-03": 105,
    "2003-04": 109,
    "2004-05": 113,
    "2005-06": 117,
    "2006-07": 122,
    "2007-08": 129,
    "2008-09": 137,
    "2009-10": 148,
    "2010-11": 167,
    "2011-12": 184,
    "2012-13": 200,
    "2013-14": 220,
    "2014-15": 240,
    "2015-16": 254,
    "2016-17": 264,
    "2017-18": 272,
    "2018-19": 280,
    "2019-20": 289,
    "2020-21": 301,
    "2021-22": 317,
    "2022-23": 331,
    "2023-24": 348,
    "2024-25": 363,
    "2025-26": 377,
  };
  const CII_YEARS = Object.keys(CII_TABLE);

  const [idxPurchasePrice, setIdxPurchasePrice] = useState("1000000");
  const [idxPurchaseYear, setIdxPurchaseYear] = useState("2014-15");
  const [idxSalePrice, setIdxSalePrice] = useState("2500000");
  const [idxSaleYear, setIdxSaleYear] = useState("2024-25");
  const [idxAssetType, setIdxAssetType] = useState<"Debt MF" | "Property" | "Gold/Bonds" | "Other">(
    "Property"
  );

  const idxResult = useMemo(() => {
    const purchase = Math.max(0, Number(idxPurchasePrice) || 0);
    const sale = Math.max(0, Number(idxSalePrice) || 0);
    const ciiPurchase = CII_TABLE[idxPurchaseYear] || 100;
    const ciiSale = CII_TABLE[idxSaleYear] || 377;

    // Without indexation
    const gainWithout = sale - purchase;
    const taxWithout = Math.max(0, gainWithout * 0.2);

    // With indexation
    const indexedCost = purchase * (ciiSale / ciiPurchase);
    const gainWith = sale - indexedCost;
    const taxWith = Math.max(0, gainWith * 0.2);

    // Tax saved
    const taxSaved = Math.max(0, taxWithout - taxWith);

    // Effective tax rate
    const effectiveTaxRate = gainWithout > 0 ? (taxWith / gainWithout) * 100 : 0;

    return {
      purchase,
      sale,
      ciiPurchase,
      ciiSale,
      indexedCost: Math.round(indexedCost),
      gainWithout,
      taxWithout: Math.round(taxWithout),
      gainWith: Math.round(gainWith),
      taxWith: Math.round(taxWith),
      taxSaved: Math.round(taxSaved),
      effectiveTaxRate,
    };
  }, [idxPurchasePrice, idxSalePrice, idxPurchaseYear, idxSaleYear]);

  const idxBarData = useMemo(
    () => [
      { name: "Purchase Price", value: idxResult.purchase, fill: THEME.accent },
      { name: "Indexed Cost", value: idxResult.indexedCost, fill: THEME.sage },
      { name: "Sale Price", value: idxResult.sale, fill: THEME.gold },
    ],
    [idxResult]
  );

  // ── RETIREMENT INCOME PLANNER STATE & LOGIC ──
  const [riCurrentAge, setRiCurrentAge] = useState("30");
  const [riRetireAge, setRiRetireAge] = useState("60");
  const [riLifeExp, setRiLifeExp] = useState("85");
  const [riInflation, setRiInflation] = useState("6");
  const [riMonthlyExp, setRiMonthlyExp] = useState(() =>
    String(Math.round(metrics?.monthExpense || 50000))
  );

  interface IncomeSource {
    name: string;
    monthly: number;
    startAge: number;
    endAge: number;
    growth: number;
  }

  const [riSources, setRiSources] = useState<IncomeSource[]>([
    { name: "EPF Pension", monthly: 5000, startAge: 58, endAge: 85, growth: 0 },
    { name: "NPS Annuity", monthly: 10000, startAge: 60, endAge: 85, growth: 0 },
    { name: "SWP from MF", monthly: 30000, startAge: 60, endAge: 85, growth: 3 },
    { name: "Rental Income", monthly: 15000, startAge: 60, endAge: 85, growth: 5 },
    { name: "FD Interest", monthly: 8000, startAge: 60, endAge: 75, growth: 0 },
  ]);

  const riResult = useMemo(() => {
    if (calcTab !== "retirement-income") return null;

    const currentAge = Number(riCurrentAge) || 30;
    const retireAge = Math.max(currentAge + 1, Number(riRetireAge) || 60);
    const lifeExp = Math.max(retireAge + 1, Number(riLifeExp) || 85);
    const inflation = (Number(riInflation) || 6) / 100;
    const monthlyExpNow = Number(riMonthlyExp) || 50000;

    const yrsToRetire = retireAge - currentAge;

    // Build year-by-year timeline from retireAge to lifeExp
    const timeline: any[] = [];
    let firstDeficitAge = -1;

    for (let age = retireAge; age <= lifeExp; age++) {
      const yearsFromNow = age - currentAge;
      const yearsFromRetire = age - retireAge;

      // Inflation-adjusted monthly expense
      const inflatedExp = monthlyExpNow * Math.pow(1 + inflation, yearsFromNow);

      // Calculate income from each source at this age
      let totalIncome = 0;
      const sourceBreakdown: Record<string, number> = {};

      for (const src of riSources) {
        if (age >= src.startAge && age <= src.endAge) {
          // Growth compounded from the source start age
          const yearsActive = age - src.startAge;
          const amount = src.monthly * Math.pow(1 + src.growth / 100, yearsActive);
          sourceBreakdown[src.name] = Math.round(amount);
          totalIncome += amount;
        } else {
          sourceBreakdown[src.name] = 0;
        }
      }

      const surplus = totalIncome - inflatedExp;
      if (surplus < 0 && firstDeficitAge === -1) {
        firstDeficitAge = age;
      }

      timeline.push({
        age,
        ...sourceBreakdown,
        totalIncome: Math.round(totalIncome),
        inflatedExpense: Math.round(inflatedExp),
        surplus: Math.round(surplus),
      });
    }

    // Summary stats at retirement
    const atRetirement = timeline[0] || { totalIncome: 0, inflatedExpense: 0, surplus: 0 };
    const totalIncomeAtRetire = atRetirement.totalIncome;
    const inflatedExpAtRetire = atRetirement.inflatedExpense;
    const surplusAtRetire = atRetirement.surplus;

    // Adequacy
    let adequacy: "green" | "yellow" | "red" = "green";
    if (surplusAtRetire < 0) {
      adequacy = "red";
    } else if (firstDeficitAge > 0) {
      adequacy = "yellow";
    }

    // Corpus calculation if there's ever a shortfall
    let corpusNeeded = 0;
    let monthlySIPNeeded = 0;
    const postReturnRate = 0.08; // assume 8% post-retirement return
    const realReturn = (1 + postReturnRate) / (1 + inflation) - 1;

    if (firstDeficitAge > 0 || surplusAtRetire < 0) {
      // Sum PV of all monthly shortfalls
      for (const pt of timeline) {
        if (pt.surplus < 0) {
          const yearsFromRetire2 = pt.age - retireAge;
          const monthlyShortfall = Math.abs(pt.surplus);
          // PV of 12 months of shortfall in that year, discounted back to retirement
          const annualShortfall = monthlyShortfall * 12;
          const pvFactor = realReturn > 0 ? Math.pow(1 + realReturn, -yearsFromRetire2) : 1;
          corpusNeeded += annualShortfall * pvFactor;
        }
      }
      corpusNeeded = Math.round(corpusNeeded);

      // Monthly SIP needed to build this corpus
      const preRetReturn = 0.12; // 12% pre-retirement
      const monthlyPreRate = preRetReturn / 12;
      const monthsToRetire = yrsToRetire * 12;
      if (monthlyPreRate > 0 && monthsToRetire > 0) {
        const fvFactor =
          ((Math.pow(1 + monthlyPreRate, monthsToRetire) - 1) / monthlyPreRate) *
          (1 + monthlyPreRate);
        monthlySIPNeeded = Math.round(corpusNeeded / fvFactor);
      }
    }

    return {
      timeline,
      totalIncomeAtRetire,
      inflatedExpAtRetire,
      surplusAtRetire,
      firstDeficitAge,
      adequacy,
      corpusNeeded,
      monthlySIPNeeded,
    };
  }, [calcTab, riCurrentAge, riRetireAge, riLifeExp, riInflation, riMonthlyExp, riSources]);

  // ── 6. LOAN VS INVEST ADVISOR STATE & LOGIC ──
  const [lviSurplus, setLviSurplus] = useState("10000");
  const [lviMode, setLviMode] = useState<"sip" | "lumpsum">("sip");
  const [lviLoanBal, setLviLoanBal] = useState("500000");
  const [lviLoanRate, setLviLoanRate] = useState("8.5");
  const [lviLoanTenure, setLviLoanTenure] = useState("120");
  const [lviInvestReturn, setLviInvestReturn] = useState("12");

  const lviResult = useMemo(() => {
    const surplus = Math.max(0, Number(lviSurplus) || 0);
    const loanBal = Math.max(0, Number(lviLoanBal) || 0);
    const loanRate = Math.max(0, Number(lviLoanRate) || 0);
    const N = Math.max(1, Number(lviLoanTenure) || 120);
    const invReturn = Math.max(0, Number(lviInvestReturn) || 0);

    const rLoan = loanRate / 12 / 100;
    const rInv = invReturn / 12 / 100;

    // EMI for the outstanding loan balance
    const emi =
      rLoan === 0
        ? loanBal / N
        : (loanBal * rLoan * Math.pow(1 + rLoan, N)) / (Math.pow(1 + rLoan, N) - 1);
    const totalPaymentsNormal = emi * N;
    const totalInterestNormal = Math.max(0, totalPaymentsNormal - loanBal);

    if (lviMode === "sip") {
      // PATH A: Prepay Loan u/s prepaying "surplus" monthly
      let balance = loanBal;
      let monthsTaken = 0;
      let cumulativeInterestPrepay = 0;

      for (let m = 1; m <= N; m++) {
        if (balance <= 0) break;
        const interest = balance * rLoan;
        cumulativeInterestPrepay += interest;
        const principalRepaid = Math.max(0, Math.min(balance, emi - interest));
        const extraPrepay = Math.min(Math.max(0, balance - principalRepaid), surplus);
        balance = Math.max(0, balance - (principalRepaid + extraPrepay));
        monthsTaken = m;
      }

      const interestSaved = Math.max(0, totalInterestNormal - cumulativeInterestPrepay);
      const monthsFreed = N - monthsTaken;

      // Compounding what they can invest AFTER loan is fully paid off early:
      // They can invest both (EMI + monthly surplus) for the remaining freed months!
      let wealthPrepayPath = 0;
      if (monthsFreed > 0) {
        const monthlyInvest = emi + surplus;
        wealthPrepayPath =
          rInv === 0
            ? monthlyInvest * monthsFreed
            : monthlyInvest * ((Math.pow(1 + rInv, monthsFreed) - 1) / rInv) * (1 + rInv);
      }

      // PATH B: Keep loan normal, invest surplus monthly for entire N months
      const wealthInvestPath =
        rInv === 0 ? surplus * N : surplus * ((Math.pow(1 + rInv, N) - 1) / rInv) * (1 + rInv);

      const isInvestBetter = wealthInvestPath > wealthPrepayPath;
      const netBenefit = Math.abs(wealthInvestPath - wealthPrepayPath);

      return {
        emi,
        normalInterest: totalInterestNormal,
        monthsTaken,
        interestSaved,
        wealthPrepay: wealthPrepayPath,
        wealthInvest: wealthInvestPath,
        isInvestBetter,
        netBenefit,
        recommendation: isInvestBetter
          ? `Invest your surplus ₹${fmtINRFull(surplus)}/mo. The compounding return of ${invReturn}% outweighs the ${loanRate}% loan interest rate.`
          : `Prepay your loan with the surplus ₹${fmtINRFull(surplus)}/mo. Paying off the debt saves interest and frees up ₹${fmtINRFull(Math.round(emi + surplus))}/mo earlier to reinvest.`,
        tip: isInvestBetter
          ? "Ensure your investment vehicle matches your target risk profile, as equity returns are variable compared to guaranteed debt savings."
          : "Prepaying a loan acts as a risk-free investment offering a guaranteed post-tax yield equal to the loan interest rate.",
      };
    } else {
      // LUMPSUM MODE: prepay lumpsum immediately vs invest lumpsum immediately
      const lumpsum = surplus;

      // Path A: prepay lumpsum immediately (reduces principal)
      const balanceAfterLumpsum = Math.max(0, loanBal - lumpsum);
      let balance = balanceAfterLumpsum;
      let monthsTaken = 0;
      let cumulativeInterestPrepay = 0;

      for (let m = 1; m <= N; m++) {
        if (balance <= 0) break;
        const interest = balance * rLoan;
        cumulativeInterestPrepay += interest;
        const principalRepaid = Math.max(0, Math.min(balance, emi - interest));
        balance = Math.max(0, balance - principalRepaid);
        monthsTaken = m;
      }

      const interestSaved = Math.max(0, totalInterestNormal - cumulativeInterestPrepay);
      const monthsFreed = N - monthsTaken;

      // After loan ends early, invest the freed EMI amount for remaining months
      let wealthPrepayPath = 0;
      if (monthsFreed > 0) {
        wealthPrepayPath =
          rInv === 0
            ? emi * monthsFreed
            : emi * ((Math.pow(1 + rInv, monthsFreed) - 1) / rInv) * (1 + rInv);
      }

      // Path B: Keep loan, invest lumpsum immediately for N months
      const wealthInvestPath = lumpsum * Math.pow(1 + rInv, N);

      const isInvestBetter = wealthInvestPath > wealthPrepayPath;
      const netBenefit = Math.abs(wealthInvestPath - wealthPrepayPath);

      return {
        emi,
        normalInterest: totalInterestNormal,
        monthsTaken,
        interestSaved,
        wealthPrepay: wealthPrepayPath,
        wealthInvest: wealthInvestPath,
        isInvestBetter,
        netBenefit,
        recommendation: isInvestBetter
          ? `Invest the lump sum ₹${fmtINRFull(lumpsum)}. Growth at ${invReturn}% CAGR beats prepaying the ${loanRate}% loan.`
          : `Prepay the loan by ₹${fmtINRFull(lumpsum)} immediately. Eliminating debt early at ${loanRate}% guaranteed return is safer and yields higher value.`,
        tip: isInvestBetter
          ? "Ideal if surplus is placed in long-term index funds or high-yielding mutual funds."
          : "Prepaying saves interest immediately and provides secure, risk-free compounding value.",
      };
    }
  }, [lviSurplus, lviMode, lviLoanBal, lviLoanRate, lviLoanTenure, lviInvestReturn]);

  // ── 7. NET WORTH PROJECTION LOGIC ──
  const [nwpSavings, setNwpSavings] = useState("30000");
  const [nwpReturn, setNwpReturn] = useState("10");
  const [nwpYears, setNwpYears] = useState("15");

  const nwpData = useMemo(() => {
    const current = Math.max(0, metrics?.netWorth || 0);
    const monthly = Math.max(0, Number(nwpSavings) || 0);
    const annualR = Math.max(0, Number(nwpReturn) || 0) / 100;
    const years = Math.max(1, Math.min(Number(nwpYears) || 15, 40));
    const startYear = new Date().getFullYear();
    const points: any[] = [];
    let corpus = current;
    for (let y = 0; y <= years; y++) {
      points.push({ year: startYear + y, value: Math.round(corpus) });
      const r = annualR / 12;
      corpus =
        r === 0
          ? corpus + monthly * 12
          : corpus * (1 + annualR) + ((monthly * (Math.pow(1 + r, 12) - 1)) / r) * (1 + r);
    }
    return points;
  }, [metrics?.netWorth, nwpSavings, nwpReturn, nwpYears]);

  // ── 8. LIQUID RUNWAY & FINANCIAL STABILITY STRESS TESTER LOGIC ──
  const [eqHaircut, setEqHaircut] = useState(30);
  const [fiHaircut, setFiHaircut] = useState(5);
  const [burnMultiplier, setBurnMultiplier] = useState(1.0);
  const [oneTimeOutflow, setOneTimeOutflow] = useState("");

  const stressResult = useMemo(() => {
    const baseEquity = Number(metrics?.mfValue || 0) + Number(metrics?.stockValue || 0);

    // Fixed Income assets (excluding EPF, as it is locked until retirement and cannot be liquid cash buffer)
    const baseFI =
      Number(metrics?.fdValue || 0) +
      Number(metrics?.rdValue || 0) +
      Number(metrics?.bondValue || 0) +
      Number(metrics?.ppfValue || 0) +
      Number(metrics?.npsValue || 0);
    const baseCash = Number(metrics?.cashInBanks || 0);

    // Loans EMI (drawn directly from loansTaken state)
    const activeEMIs = (state?.loansTaken || []).reduce(
      (sum: number, l: any) => sum + Number(l.emi || 0),
      0
    );
    const monthlyExpense = Number(metrics?.monthExpense || 0);

    // Stress deductions
    const stressEquity = baseEquity * (1 - eqHaircut / 100);
    const stressFI = baseFI * (1 - fiHaircut / 100);
    const stressCash = baseCash;

    const totalLiquidAssets = stressEquity + stressFI + stressCash;
    const crisisBurnRate = monthlyExpense * burnMultiplier + activeEMIs;

    const outflowAmount = Number(oneTimeOutflow) || 0;
    const netStressAssets = Math.max(0, totalLiquidAssets - outflowAmount);

    const runwayMonths =
      crisisBurnRate > 0 ? netStressAssets / crisisBurnRate : netStressAssets > 0 ? 99 : 0;

    let safetyLevel: "critical" | "caution" | "safe" | "elite" = "safe";
    if (runwayMonths < 3) safetyLevel = "critical";
    else if (runwayMonths < 6) safetyLevel = "caution";
    else if (runwayMonths >= 12) safetyLevel = "elite";

    return {
      baseEquity,
      baseFI,
      baseCash,
      activeEMIs,
      monthlyExpense,
      stressEquity,
      stressFI,
      stressCash,
      totalLiquidAssets,
      crisisBurnRate,
      netStressAssets,
      runwayMonths,
      safetyLevel,
    };
  }, [metrics, state, eqHaircut, fiHaircut, burnMultiplier, oneTimeOutflow]);

  // ── INPUT ROW HELPERS ──
  const inpRow = (lbl: string, val: string, set: (v: string) => void, placeholder = "") => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>
        {lbl}
      </label>
      <input
        className="form-input"
        aria-label={lbl}
        type="number"
        value={val}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );

  const sliderRow = (
    lbl: string,
    val: string,
    set: (v: string) => void,
    min: number,
    max: number,
    step = 1,
    unit = ""
  ) => (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: THEME.muted,
          marginBottom: 6,
          fontWeight: 600,
        }}
      >
        <span>{lbl}</span>
        <span style={{ color: THEME.accent, fontWeight: 800 }}>
          {val}
          {unit}
        </span>
      </div>
      <input
        className="cxo-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        aria-label={lbl}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );

  const resultRow = (lbl: string, val: number, highlight?: boolean, color?: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: `1px dashed ${THEME.line}`,
        fontSize: 14,
      }}
    >
      <span style={{ color: THEME.muted, fontWeight: 500 }}>{lbl}</span>
      <span
        style={{
          fontWeight: highlight ? 900 : 700,
          color: color || (highlight ? THEME.sage : THEME.ink),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmtINRFull(val)}
      </span>
    </div>
  );

  return (
    <div className="tab-content-enter">
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: THEME.line,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: THEME.accent,
          }}
        >
          <Calculator size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Financial Calculators
          </h2>
          <p style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
            Interactive planning suite for growth projection, liabilities, and retirement targeting
          </p>
        </div>
      </div>

      {/* ── CONTEXT TILE STRIP ── */}
      {(() => {
        const totalEMIs = (state?.loansTaken || []).reduce(
          (s: number, l: any) => s + Number(l.emi || 0),
          0
        );
        const monthlySavings = Math.max(
          0,
          (metrics?.monthIncome || 0) - (metrics?.monthExpense || 0)
        );
        const tiles = [
          {
            label: "Current Net Worth",
            value: fmtINRFull(metrics?.netWorth || 0),
            sub: "Total assets minus liabilities",
            color: THEME.accent,
            Icon: TrendingUp,
          },
          {
            label: "Monthly Expenses",
            value: fmtINRFull(metrics?.monthExpense || 0),
            sub: "Baseline for FIRE & runway calcs",
            color: THEME.gold,
            Icon: Wallet,
          },
          {
            label: "Est. Monthly Savings",
            value: fmtINRFull(monthlySavings),
            sub:
              metrics?.monthIncome > 0
                ? `${((monthlySavings / metrics.monthIncome) * 100).toFixed(0)}% savings rate`
                : "Use in SIP & projection",
            color: monthlySavings > 0 ? THEME.sage : THEME.muted,
            Icon: BarChart2,
          },
          {
            label: "Total Loan EMIs",
            value: fmtINRFull(totalEMIs),
            sub: totalEMIs > 0 ? "Active monthly debt burden" : "No active loans",
            color: totalEMIs > 0 ? THEME.rust : THEME.muted,
            Icon: Coins,
          },
        ];
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            {tiles.map(({ label, value, sub, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${color} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
                {sub && <div style={{ fontSize: 10, color: THEME.muted }}>{sub}</div>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── PILL SELECTION BAR ── */}
      <div
        className="demat-portfolio-bar no-scrollbar"
        role="tablist"
        aria-label="Calculator tools"
        style={{ marginBottom: 24, padding: "4px" }}
      >
        {[
          { id: "emi", label: "EMI Calculator", icon: Clock },
          { id: "sip", label: "SIP Returns", icon: TrendingUp },
          { id: "step-sip", label: "Step-Up SIP", icon: Sparkles },
          { id: "swp", label: "SWP Calculator", icon: Wallet },
          { id: "cagr", label: "CAGR Calculator", icon: BarChart2 },
          { id: "fire", label: "FIRE Planner", icon: Flame },
          { id: "fdrd", label: "FD & RD Maturity", icon: Coins },
          { id: "loan-invest", label: "Loan vs Invest", icon: ArrowRightLeft },
          { id: "projection", label: "Wealth Projection", icon: Briefcase },
          { id: "stress", label: "Runway Stress Tester", icon: Shield },
          { id: "monte-carlo", label: "Monte Carlo Simulator", icon: Sparkles },
          { id: "scenario-sandbox", label: "Scenario Sandbox", icon: GitBranch },
          { id: "indexation", label: "Indexation", icon: Coins },
          { id: "retirement-income", label: "Retirement Income", icon: Briefcase },
        ].map((t) => {
          const active = calcTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setCalcTab(t.id as any)}
              role="tab"
              aria-selected={active}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── ACTIVE CALCULATOR CONTAINER ── */}
      <div className="bento-grid">
        {/* ── 1. EMI CALCULATOR ── */}
        {calcTab === "emi" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Clock size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>EMI Calculator Parameters</div>
                </div>
                {inpRow("Loan Principal (₹)", emiP, setEmiP)}
                {sliderRow("Interest Rate", emiR, setEmiR, 1, 20, 0.1, "%")}
                {sliderRow("Tenure", emiN, setEmiN, 12, 360, 12, " months")}
              </Card>
            </div>
            <div className="bento-col-8">
              <Card style={{ padding: 24, height: "100%" }}>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}
                >
                  Principal vs Interest Breakdown
                </div>
                <div className="bento-grid" style={{ gap: 24 }}>
                  <div
                    className="bento-col-6"
                    style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
                  >
                    <div
                      style={{
                        padding: 18,
                        background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                        borderRadius: 12,
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      {resultRow("Monthly EMI Due", emiResult.emi, true, THEME.accent)}
                      {resultRow("Principal Amount", Number(emiP) || 0)}
                      {resultRow("Total Interest Paid", emiResult.interest, false, THEME.gold)}
                      {resultRow("Total Payments", emiResult.total)}
                    </div>
                  </div>
                  <div
                    className="bento-col-6"
                    style={{
                      height: 220,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={emiPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {emiPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => fmtINRFull(v)}
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 8,
                            color: THEME.ink,
                          }}
                          labelStyle={{ color: THEME.ink }}
                          itemStyle={{ color: THEME.ink }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer></div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 2. SIP RETURNS ── */}
        {calcTab === "sip" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <TrendingUp size={18} color={THEME.sage} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>SIP Calculator Parameters</div>
                </div>
                {inpRow("Monthly Investment (₹)", sipAmt, setSipAmt)}
                {sliderRow("Expected Annual Return", sipRate, setSipRate, 1, 30, 0.5, "%")}
                {sliderRow("Period", sipYrs, setSipYrs, 1, 40, 1, " years")}
              </Card>
            </div>
            <div className="bento-col-8">
              <Card style={{ padding: 24, height: "100%" }}>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}
                >
                  Compounded Returns Projection
                </div>
                <div className="bento-grid" style={{ gap: 24 }}>
                  <div
                    className="bento-col-6"
                    style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
                  >
                    <div
                      style={{
                        padding: 18,
                        background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                        borderRadius: 12,
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      {resultRow("Estimated Future Value", sipResult.corpus, true, THEME.sage)}
                      {resultRow("Invested Amount", sipResult.invested)}
                      {resultRow("Wealth Gain", sipResult.gains, false, THEME.sage)}
                    </div>
                  </div>
                  <div
                    className="bento-col-6"
                    style={{
                      height: 220,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={sipPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {sipPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => fmtINRFull(v)}
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 8,
                            color: THEME.ink,
                          }}
                          labelStyle={{ color: THEME.ink }}
                          itemStyle={{ color: THEME.ink }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer></div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 2b. STEP-UP SIP CALCULATOR ── */}
        {calcTab === "step-sip" && (
          <>
            <div className="bento-col-5">
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Sparkles size={18} color={THEME.gold} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Step-Up SIP Parameters</div>
                </div>
                {inpRow("Starting Monthly SIP (₹)", stepSipAmt, setStepSipAmt)}
                {sliderRow("Annual Step-Up %", stepSipStep, setStepSipStep, 0, 50, 1, "%")}
                {sliderRow("Investment Period", stepSipYrs, setStepSipYrs, 1, 40, 1, " years")}
                {sliderRow("Expected Annual Return", stepSipRate, setStepSipRate, 4, 30, 0.5, "%")}

                <div className="divider" style={{ margin: "20px 0 16px" }} />
                <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, lineHeight: 1.6 }}>
                  A Step-Up SIP increases your monthly investment by a fixed % each year, matching
                  salary hikes and compounding wealth faster than a flat SIP.
                </div>
              </Card>
            </div>

            <div
              className="bento-col-7"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Key results */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                <div
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 6,
                    }}
                  >
                    Final Corpus
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: THEME.accent }}>
                    {fmtINRFull(stepSipResult.corpus)}
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 6,
                    }}
                  >
                    Total Invested
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                    {fmtINRFull(stepSipResult.invested)}
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 6,
                    }}
                  >
                    Net Gains
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: THEME.sage }}>
                    {fmtINRFull(stepSipResult.gains)}
                  </div>
                </div>
              </div>

              {/* vs Flat SIP comparison */}
              <Card style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                  }}
                >
                  Step-Up vs Flat SIP Comparison
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.gold} 4%, transparent)`,
                      border: `1.5px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, marginBottom: 4 }}
                    >
                      Step-Up SIP Corpus
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: THEME.gold }}>
                      {fmtINRFull(stepSipResult.corpus)}
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                      Invested: {fmtINRFull(stepSipResult.invested)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                      border: `1.5px solid ${THEME.line}`,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, marginBottom: 4 }}
                    >
                      Flat SIP Corpus
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>
                      {fmtINRFull(stepSipResult.flatCorpus)}
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                      Invested: {fmtINRFull(stepSipResult.flatInvested)}
                    </div>
                  </div>
                </div>
                {stepSipResult.extraGains > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: THEME.sage,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TrendingUp size={14} />
                    Step-Up earns {fmtINRFull(stepSipResult.extraGains)} more than flat SIP over{" "}
                    {stepSipYrs} years
                  </div>
                )}
              </Card>

              {/* Growth chart */}
              <Card style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                  }}
                >
                  Year-by-Year Growth
                </div>
                <div style={{ height: 200 }}>
                  <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                      data={stepSipResult.yearlyData}
                      margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gStepCorpus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={THEME.accent} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gStepInvested" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.muted} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={THEME.muted} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 10, fill: "var(--t-muted)" }}
                        tickFormatter={(v) => `Y${v}`}
                      />
                      <YAxis
                        tickFormatter={fmtINRFull}
                        tick={{ fontSize: 10, fill: "var(--t-muted)" }}
                      />
                      <Tooltip
                        formatter={(v: any) => fmtINRFull(v)}
                        cursor={{ stroke: THEME.line }}
                        contentStyle={{
                          background: "var(--t-card-bg)",
                          borderColor: THEME.line,
                          fontSize: 12,
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.ink }}
                        itemStyle={{ color: THEME.ink }}
                      />
                      <Area
                        type="monotone"
                        dataKey="corpus"
                        name="Corpus"
                        stroke={THEME.accent}
                        strokeWidth={2.5}
                        fill="url(#gStepCorpus)"
                      />
                      <Area
                        type="monotone"
                        dataKey="invested"
                        name="Invested"
                        stroke={THEME.muted}
                        strokeWidth={1.5}
                        fill="url(#gStepInvested)"
                        strokeDasharray="4 2"
                      />
                    </AreaChart>
                  </ResponsiveContainer></div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 2c. SWP CALCULATOR ── */}
        {calcTab === "swp" && (
          <>
            <div className="bento-col-5">
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Wallet size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>SWP Parameters</div>
                </div>
                {inpRow("Initial Corpus (₹)", swpCorpus, setSwpCorpus)}
                {inpRow("Monthly Withdrawal (₹)", swpWithdrawal, setSwpWithdrawal)}
                {sliderRow("Expected Annual Return", swpRate, setSwpRate, 1, 15, 0.5, "%")}
                {sliderRow("Planning Period", swpYears, setSwpYears, 1, 40, 1, " years")}

                <div className="divider" style={{ margin: "20px 0 16px" }} />
                <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, lineHeight: 1.6 }}>
                  A Systematic Withdrawal Plan lets you withdraw a fixed amount monthly from your
                  corpus while the remaining amount continues to earn returns — ideal for retirement
                  income planning.
                </div>

                {/* Perpetuity tip */}
                {swpResult.perpetuityCorpus && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
                      fontSize: 11.5,
                      color: THEME.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: THEME.accent, fontWeight: 700 }}>Perpetuity tip: </span>
                    To withdraw {fmtINRFull(swpWithdrawal)}/month{" "}
                    <strong>forever</strong>, you need{" "}
                    <span style={{ color: THEME.accent, fontWeight: 700 }}>
                      {fmtINRFull(swpResult.perpetuityCorpus)}
                    </span>{" "}
                    at {swpRate}% p.a.
                  </div>
                )}
              </Card>
            </div>

            <div
              className="bento-col-7"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Key result tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {/* Remaining corpus */}
                <div
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: swpResult.isSustainable
                      ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)`
                      : swpResult.remainingCorpus > 0
                        ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)`
                        : `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${
                      swpResult.isSustainable
                        ? THEME.sage
                        : swpResult.remainingCorpus > 0
                          ? THEME.accent
                          : THEME.rust
                    } 30%, transparent)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 6,
                    }}
                  >
                    Corpus After {swpYears}y
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: swpResult.isSustainable
                        ? THEME.sage
                        : swpResult.remainingCorpus > 0
                          ? THEME.accent
                          : THEME.rust,
                    }}
                  >
                    {fmtINRFull(swpResult.remainingCorpus)}
                  </div>
                </div>

                {/* Total withdrawn */}
                <div
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: `color-mix(in srgb, ${THEME.muted} 6%, transparent)`,
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 6,
                    }}
                  >
                    Total Withdrawn
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                    {fmtINRFull(swpResult.totalWithdrawn)}
                  </div>
                </div>

                {/* Status */}
                <div
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: swpResult.isSustainable
                      ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)`
                      : swpResult.depletionMonth > 0
                        ? `color-mix(in srgb, ${THEME.rust} 10%, transparent)`
                        : `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${
                      swpResult.isSustainable
                        ? THEME.sage
                        : swpResult.depletionMonth > 0
                          ? THEME.rust
                          : THEME.gold
                    } 30%, transparent)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 6,
                    }}
                  >
                    Status
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: swpResult.isSustainable
                        ? THEME.sage
                        : swpResult.depletionMonth > 0
                          ? THEME.rust
                          : THEME.gold,
                    }}
                  >
                    {swpResult.isSustainable
                      ? "Self-Sustaining"
                      : swpResult.depletionMonth > 0
                        ? `Depletes in ${Math.floor(swpResult.depletionMonth / 12)}y ${swpResult.depletionMonth % 12}m`
                        : "Corpus Survives"}
                  </div>
                </div>
              </div>

              {/* Analysis card */}
              <Card style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                  }}
                >
                  Sustainability Analysis
                </div>

                {swpResult.isSustainable ? (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                      border: `1.5px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <CheckCircle2
                      size={18}
                      color={THEME.sage}
                      style={{ marginTop: 1, flexShrink: 0 }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: THEME.sage,
                          marginBottom: 4,
                        }}
                      >
                        Corpus is fully self-sustaining
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
                        Your monthly interest of{" "}
                        <strong style={{ color: THEME.ink }}>
                          {fmtINRFull(swpResult.monthlyInterest)}
                        </strong>{" "}
                        exceeds your withdrawal of{" "}
                        <strong style={{ color: THEME.ink }}>
                          {fmtINRFull(swpWithdrawal)}
                        </strong>
                        . The corpus will grow over time even after withdrawals.
                      </div>
                    </div>
                  </div>
                ) : swpResult.depletionMonth > 0 ? (
                  <>
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                        border: `1.5px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <AlertTriangle
                        size={18}
                        color={THEME.rust}
                        style={{ marginTop: 1, flexShrink: 0 }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: THEME.rust,
                            marginBottom: 4,
                          }}
                        >
                          Corpus depletes in{" "}
                          {Math.floor(swpResult.depletionMonth / 12) > 0
                            ? `${Math.floor(swpResult.depletionMonth / 12)} year${Math.floor(swpResult.depletionMonth / 12) > 1 ? "s" : ""}`
                            : ""}{" "}
                          {swpResult.depletionMonth % 12 > 0
                            ? `${swpResult.depletionMonth % 12} month${swpResult.depletionMonth % 12 > 1 ? "s" : ""}`
                            : ""}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
                          At {fmtINRFull(swpWithdrawal)}/month, your corpus
                          runs out before the {swpYears}-year planning period ends.
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                          border: `1.5px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: THEME.muted,
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                        >
                          MIN CORPUS NEEDED
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: THEME.gold }}>
                          {fmtINRFull(swpResult.minCorpus)}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 3 }}>
                          to sustain {fmtINRFull(swpWithdrawal)}/mo for{" "}
                          {swpYears}y
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                          border: `1.5px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: THEME.muted,
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                        >
                          CORPUS SHORTFALL
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: THEME.rust }}>
                          {fmtINRFull(swpResult.deficit)}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 3 }}>
                          additional corpus required
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                      border: `1.5px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <Info size={18} color={THEME.gold} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: THEME.gold,
                          marginBottom: 4,
                        }}
                      >
                        Corpus survives the planning period
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
                        Remaining corpus after {swpYears} years:{" "}
                        <strong style={{ color: THEME.ink }}>
                          {fmtINRFull(swpResult.remainingCorpus)}
                        </strong>
                        . Consider increasing your monthly withdrawal or extending the period.
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Year-by-year corpus balance chart */}
              <Card style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 14,
                  }}
                >
                  Year-by-Year Corpus Balance
                </div>
                <div style={{ height: 200 }}>
                  <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                      data={swpResult.yearlyData}
                      margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gSwpBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor={swpResult.isSustainable ? THEME.sage : THEME.accent}
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor={swpResult.isSustainable ? THEME.sage : THEME.accent}
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="gSwpWithdrawn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.muted} stopOpacity={0.2} />
                          <stop offset="100%" stopColor={THEME.muted} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 10, fill: "var(--t-muted)" }}
                        tickFormatter={(v) => `Y${v}`}
                      />
                      <YAxis
                        tickFormatter={fmtINRFull}
                        tick={{ fontSize: 10, fill: "var(--t-muted)" }}
                      />
                      <Tooltip
                        formatter={(v: any) => fmtINRFull(v)}
                        cursor={{ stroke: THEME.line }}
                        contentStyle={{
                          background: "var(--t-card-bg)",
                          borderColor: THEME.line,
                          fontSize: 12,
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.ink }}
                        itemStyle={{ color: THEME.ink }}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        name="Corpus Balance"
                        stroke={swpResult.isSustainable ? THEME.sage : THEME.accent}
                        strokeWidth={2.5}
                        fill="url(#gSwpBalance)"
                      />
                      <Area
                        type="monotone"
                        dataKey="withdrawn"
                        name="Total Withdrawn"
                        stroke={THEME.muted}
                        strokeWidth={1.5}
                        fill="url(#gSwpWithdrawn)"
                        strokeDasharray="4 2"
                      />
                    </AreaChart>
                  </ResponsiveContainer></div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 3. CAGR CALCULATOR ── */}
        {calcTab === "cagr" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <BarChart2 size={18} color={THEME.rust} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>CAGR Parameters</div>
                </div>
                {inpRow("Initial Value / Invested (₹)", cagrInvested, setCagrInvested)}
                {inpRow("Final Value / Current (₹)", cagrCurrent, setCagrCurrent)}
                {sliderRow("Holding Period", cagrYears, setCagrYears, 0.5, 20, 0.5, " years")}
              </Card>
            </div>
            <div className="bento-col-8">
              <Card
                style={{
                  padding: 24,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}
                >
                  Annualized Compounded Growth Rate
                </div>
                <div
                  style={{
                    padding: 24,
                    background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                    borderRadius: 12,
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: `1px dashed ${THEME.line}`,
                      fontSize: 15,
                    }}
                  >
                    <span style={{ color: THEME.muted, fontWeight: 600 }}>
                      CAGR Yield (Annualized)
                    </span>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: 26,
                        color:
                          cagrResult.cagr !== null && cagrResult.cagr >= 0
                            ? THEME.sage
                            : THEME.rust,
                      }}
                    >
                      {cagrResult.cagr !== null ? `${cagrResult.cagr.toFixed(2)}%` : "—"}
                    </span>
                  </div>
                  {resultRow(
                    "Absolute Wealth Gain",
                    cagrResult.absoluteReturn,
                    false,
                    cagrResult.absoluteReturn >= 0 ? THEME.sage : THEME.rust
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ color: THEME.muted, fontWeight: 500 }}>Absolute Return %</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: cagrResult.absolutePct >= 0 ? THEME.sage : THEME.rust,
                      }}
                    >
                      {cagrResult.absolutePct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 4. FIRE RETIREMENT PLANNER ── */}
        {calcTab === "fire" && (
          <>
            <div className="bento-col-5">
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Flame size={18} color={THEME.gold} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Retirement Parameters</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {inpRow("Current Age", fireAge, setFireAge)}
                  {inpRow("Retirement Age", fireRetireAge, setFireRetireAge)}
                </div>
                {inpRow("Current Monthly Expenses (₹)", fireExpense, setFireExpense)}
                {inpRow("Current Net Worth / Corpus (₹)", firePortfolio, setFirePortfolio)}
                {inpRow("Expected Monthly Savings (₹)", fireSavings, setFireSavings)}

                <div className="divider" style={{ margin: "20px 0 16px" }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 12 }}>
                  Economic & Yield Assumptions
                </div>

                {sliderRow("Inflation Rate", fireInflation, setFireInflation, 1, 15, 0.5, "%")}
                {sliderRow(
                  "Pre-Retirement Yield",
                  firePreReturn,
                  setFirePreReturn,
                  4,
                  25,
                  0.5,
                  "%"
                )}
                {sliderRow(
                  "Post-Retirement Yield",
                  firePostReturn,
                  setFirePostReturn,
                  4,
                  18,
                  0.5,
                  "%"
                )}
                {sliderRow("Life Expectancy", fireLifeExp, setFireLifeExp, 60, 100, 1, " yrs")}
              </Card>
            </div>

            <div
              className="bento-col-7"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Negative real return warning */}
              {fireResult.realPostReturn < 0 && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: THEME.gold,
                    lineHeight: 1.5,
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    Inflation ({(fireResult.infl * 100).toFixed(1)}%) exceeds post-retirement yield
                    ({(fireResult.postRet * 100).toFixed(1)}%) — real returns are negative (
                    {(fireResult.realPostReturn * 100).toFixed(1)}%). The required corpus shown may
                    be unrealistically large. Consider raising post-retirement yield assumption
                    above the inflation rate.
                  </span>
                </div>
              )}

              {/* Tracker Card */}
              <Card
                style={{
                  padding: 24,
                  borderTop: `4px solid ${fireResult.percentOnTrack >= 80 ? THEME.sage : fireResult.percentOnTrack >= 45 ? THEME.gold : THEME.rust}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: THEME.muted,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Retirement Savings Status
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: THEME.ink, marginTop: 4 }}>
                      {fireResult.percentOnTrack}% Target Achieved
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: THEME.muted }}>Safe Withdrawal Rate</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: THEME.accent }}>
                      {fireResult.safeWithdrawalRate.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Progress fill bar */}
                <div className="progress-track" style={{ marginBottom: 16 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${fireResult.percentOnTrack}%`,
                      background:
                        fireResult.percentOnTrack >= 80
                          ? THEME.sage
                          : fireResult.percentOnTrack >= 45
                            ? THEME.gold
                            : THEME.rust,
                      transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                      padding: "4px 8px",
                      borderRadius: 6,
                    }}
                  >
                    <Clock size={11} /> Years to Retire: {fireResult.yrsToRet}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                      padding: "4px 8px",
                      borderRadius: 6,
                    }}
                  >
                    <CalendarDays size={11} /> Years in Retirement: {fireResult.yrsInRet}
                  </span>
                </div>
              </Card>

              {/* Corpus Breakdown */}
              <Card style={{ padding: 24, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 16,
                  }}
                >
                  Corpus & Safe Withdrawal Projection
                </div>
                <div
                  style={{
                    padding: 18,
                    background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                    borderRadius: 12,
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  {resultRow(
                    "Monthly Expense at Retirement",
                    fireResult.retMonthlyExp,
                    false,
                    THEME.gold
                  )}
                  {resultRow("Target Corpus Required", fireResult.reqCorpus, true, THEME.accent)}
                  {resultRow(
                    "Projected Corpus Available",
                    fireResult.projectedCorpus,
                    false,
                    THEME.sage
                  )}

                  <div className="divider" style={{ margin: "14px 0" }} />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ color: THEME.muted, fontWeight: 700 }}>
                      {fireResult.gap > 0 ? "Retirement Shortfall" : "Financial Surplus"}
                    </span>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: 18,
                        color: fireResult.gap > 0 ? THEME.rust : THEME.sage,
                      }}
                    >
                      {fmtINRFull(Math.abs(fireResult.gap))}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background:
                      fireResult.gap <= 0
                        ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)`
                        : `color-mix(in srgb, ${THEME.rust} 4%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${fireResult.gap <= 0 ? THEME.sage : THEME.rust} 13%, transparent)`,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    fontWeight: 600,
                    color: fireResult.gap <= 0 ? THEME.sage : THEME.rust,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  {fireResult.gap <= 0 ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>
                        Congratulations! Your projected retirement corpus fully covers your target
                        expense with a secure safe withdrawal profile. You are fully on track to
                        achieve financial independence early.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      <span>
                        To close the shortfall gap of {fmtINRFull(fireResult.gap)}, consider
                        increasing your monthly savings by{" "}
                        {fmtINRFull(Math.round(fireResult.gap / (fireResult.yrsToRet * 12)))}/mo or
                        pushing retirement age out by 2-3 years.
                      </span>
                    </>
                  )}
                </div>
              </Card>

              {/* ── FIRE Enhancement: Additional Insights ── */}
              <Card style={{ padding: 24, borderTop: `4px solid ${THEME.accent}` }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    marginBottom: 16,
                    letterSpacing: "-0.02em",
                  }}
                >
                  FIRE Quick Insights
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginBottom: 4 }}
                    >
                      Current Runway
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: THEME.accent }}>
                      {fireResult.currentRunwayYears === Infinity
                        ? "∞"
                        : `${fireResult.currentRunwayYears} yrs`}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      {fireResult.currentRunwayMonths === Infinity
                        ? "No expenses"
                        : `${fireResult.currentRunwayMonths} months at current spend`}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.sage} 3%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginBottom: 4 }}
                    >
                      Projected FIRE Year
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: THEME.sage }}>
                      {fireResult.projectedFireYear ? fireResult.projectedFireYear : "N/A"}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      {fireResult.projectedFireYear
                        ? `Age ${Number(fireAge) + (fireResult.projectedFireYear - new Date().getFullYear())}`
                        : "Increase savings to project"}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.gold} 3%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.gold} 13%, transparent)`,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginBottom: 4 }}
                    >
                      Savings Needed to Close Gap
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: THEME.gold }}>
                      {fireResult.monthlySavingsNeeded > 0
                        ? fmtINRFull(fireResult.monthlySavingsNeeded)
                        : "On Track"}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      {fireResult.monthlySavingsNeeded > 0
                        ? "additional per month needed"
                        : "Current savings exceed target"}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${fireResult.fourPctProgress >= 100 ? THEME.sage : THEME.rust} 3%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${fireResult.fourPctProgress >= 100 ? THEME.sage : THEME.rust} 13%, transparent)`,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginBottom: 4 }}
                    >
                      4% Rule Status
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: fireResult.fourPctProgress >= 100 ? THEME.sage : THEME.rust,
                      }}
                    >
                      {fireResult.fourPctProgress}%
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      Need {fmtINRFull(fireResult.fourPctCorpus)} corpus
                    </div>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: `color-mix(in srgb, ${THEME.muted} 13%, transparent)`,
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          width: `${Math.min(100, fireResult.fourPctProgress)}%`,
                          background:
                            fireResult.fourPctProgress >= 100
                              ? THEME.sage
                              : fireResult.fourPctProgress >= 50
                                ? THEME.gold
                                : THEME.rust,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 5. FD & RD MATURITY CALCULATOR ── */}
        {calcTab === "fdrd" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 20,
                    background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                    padding: 4,
                    borderRadius: 10,
                  }}
                >
                  <button
                    onClick={() => setFdrdType("fd")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: fdrdType === "fd" ? "var(--surface-0)" : "transparent",
                      color: fdrdType === "fd" ? THEME.accent : THEME.muted,
                      boxShadow: fdrdType === "fd" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    Fixed Deposit (FD)
                  </button>
                  <button
                    onClick={() => setFdrdType("rd")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: fdrdType === "rd" ? "var(--surface-0)" : "transparent",
                      color: fdrdType === "rd" ? THEME.accent : THEME.muted,
                      boxShadow: fdrdType === "rd" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    Recurring Deposit (RD)
                  </button>
                </div>

                {fdrdType === "fd" ? (
                  <>
                    {inpRow("Lump Sum Deposit (₹)", fdAmt, setFdAmt)}
                    {sliderRow("Annual Interest Rate", fdRate, setFdRate, 2, 12, 0.05, "%")}
                    {sliderRow("Tenure", fdYrs, setFdYrs, 1, 15, 1, " years")}

                    <div style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: THEME.muted,
                          marginBottom: 4,
                          fontWeight: 600,
                        }}
                      >
                        Compounding Interval
                      </div>
                      <select
                        value={fdComp}
                        onChange={(e) => setFdComp(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: "var(--t-card-bg)",
                          border: `1.5px solid ${THEME.line}`,
                          borderRadius: 10,
                          color: THEME.ink,
                          fontSize: 14,
                        }}
                      >
                        <option value="4">Quarterly (Standard)</option>
                        <option value="12">Monthly</option>
                        <option value="2">Half-Yearly</option>
                        <option value="1">Yearly</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {inpRow("Monthly Deposit Amount (₹)", rdAmt, setRdAmt)}
                    {sliderRow("Annual Interest Rate", rdRate, setRdRate, 2, 12, 0.05, "%")}
                    {sliderRow("Tenure", rdMonths, setRdMonths, 6, 120, 6, " months")}
                  </>
                )}
              </Card>
            </div>

            <div className="bento-col-8">
              <Card style={{ padding: 24, height: "100%" }}>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}
                >
                  Maturity Proceeds Breakdown
                </div>
                <div className="bento-grid" style={{ gap: 24 }}>
                  <div
                    className="bento-col-6"
                    style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
                  >
                    <div
                      style={{
                        padding: 18,
                        background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                        borderRadius: 12,
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      {resultRow(
                        "Estimated Maturity proceeds",
                        fdrdResult.maturity,
                        true,
                        THEME.sage
                      )}
                      {resultRow("Total Invested Principal", fdrdResult.invested)}
                      {resultRow(
                        "Compounded Interest Earned",
                        fdrdResult.interest,
                        false,
                        THEME.sage
                      )}
                    </div>
                  </div>
                  <div
                    className="bento-col-6"
                    style={{
                      height: 220,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={fdrdPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {fdrdPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => fmtINRFull(v)}
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 8,
                            color: THEME.ink,
                          }}
                          labelStyle={{ color: THEME.ink }}
                          itemStyle={{ color: THEME.ink }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer></div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 6. LOAN VS INVEST ADVISOR ── */}
        {calcTab === "loan-invest" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <ArrowRightLeft size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Comparison Inputs</div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 16,
                    background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                    padding: 4,
                    borderRadius: 10,
                  }}
                >
                  <button
                    onClick={() => setLviMode("sip")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: lviMode === "sip" ? "var(--surface-0)" : "transparent",
                      color: lviMode === "sip" ? THEME.accent : THEME.muted,
                      boxShadow: lviMode === "sip" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    Monthly Surplus
                  </button>
                  <button
                    onClick={() => setLviMode("lumpsum")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: lviMode === "lumpsum" ? "var(--surface-0)" : "transparent",
                      color: lviMode === "lumpsum" ? THEME.accent : THEME.muted,
                      boxShadow: lviMode === "lumpsum" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    Lump Sum cash
                  </button>
                </div>

                {inpRow(
                  lviMode === "sip" ? "Monthly Surplus (₹)" : "Lump Sum Available (₹)",
                  lviSurplus,
                  setLviSurplus
                )}
                {inpRow("Loan Outstanding balance (₹)", lviLoanBal, setLviLoanBal)}
                {sliderRow("Loan Interest Rate", lviLoanRate, setLviLoanRate, 3, 20, 0.1, "%")}
                {sliderRow(
                  "Remaining Tenure",
                  lviLoanTenure,
                  setLviLoanTenure,
                  12,
                  360,
                  12,
                  " months"
                )}
                {sliderRow(
                  "Expected Invest Return",
                  lviInvestReturn,
                  setLviInvestReturn,
                  4,
                  25,
                  0.5,
                  "%"
                )}
              </Card>
            </div>

            <div
              className="bento-col-8"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Recommendation Advisory Card */}
              <Card
                style={{
                  padding: 24,
                  borderTop: `4px solid ${lviResult.isInvestBetter ? THEME.sage : THEME.gold}`,
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: lviResult.isInvestBetter
                        ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                        : `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: lviResult.isInvestBetter ? THEME.sage : THEME.gold,
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: THEME.muted,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Advisory Verdict
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: THEME.ink,
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      {lviResult.recommendation}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: THEME.muted,
                        marginTop: 10,
                        fontStyle: "italic",
                        borderTop: `1px solid ${THEME.line}`,
                        paddingTop: 8,
                      }}
                    >
                      <Lightbulb
                        size={12}
                        style={{ verticalAlign: -2, marginRight: 2, flexShrink: 0 }}
                      />{" "}
                      <b>CTO/CFO Tip:</b> {lviResult.tip}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Wealth Projection Comparison */}
              <Card style={{ padding: 24, flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 16,
                  }}
                >
                  Financial Breakdown
                </div>
                <div className="bento-grid" style={{ gap: 20 }}>
                  <div className="bento-col-6">
                    <div
                      style={{
                        padding: 16,
                        background: `color-mix(in srgb, ${THEME.muted} 2%, transparent)`,
                        borderRadius: 12,
                        border: `1.5px solid color-mix(in srgb, ${lviResult.isInvestBetter ? THEME.line : THEME.gold} 27%, transparent)`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          color: THEME.muted,
                          marginBottom: 8,
                        }}
                      >
                        Path A: Prepay Loan
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>
                        {fmtINRFull(lviResult.wealthPrepay)}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        Net wealth at month {lviLoanTenure}
                      </div>

                      <div className="divider" style={{ margin: "10px 0" }} />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          color: THEME.sage,
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={12} /> Paid off in {lviResult.monthsTaken} months
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                        Saved {fmtINRFull(lviResult.interestSaved)} in interest
                      </div>
                    </div>
                  </div>

                  <div className="bento-col-6">
                    <div
                      style={{
                        padding: 16,
                        background: `color-mix(in srgb, ${THEME.muted} 2%, transparent)`,
                        borderRadius: 12,
                        border: `1.5px solid color-mix(in srgb, ${lviResult.isInvestBetter ? THEME.sage : THEME.line} 27%, transparent)`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          color: THEME.muted,
                          marginBottom: 8,
                        }}
                      >
                        Path B: Invest Surplus
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink }}>
                        {fmtINRFull(lviResult.wealthInvest)}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        Net wealth at month {lviLoanTenure}
                      </div>

                      <div className="divider" style={{ margin: "10px 0" }} />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          color: THEME.accent,
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={12} /> Standard EMI remains
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                        Compound return at {lviInvestReturn}%
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: `1px solid ${THEME.line}`,
                    marginTop: 20,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.muted }}>
                    Net Benefit Difference
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: THEME.sage }}>
                    {fmtINRFull(lviResult.netBenefit)}
                  </span>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 7. NET WORTH PROJECTION ── */}
        {calcTab === "projection" && (
          <div className="bento-col-12">
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <Briefcase size={18} color={THEME.gold} />
                <div style={{ fontSize: 16, fontWeight: 700 }}>Compound Net Worth Projection</div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {inpRow("Monthly Future Savings (₹)", nwpSavings, setNwpSavings)}
                {sliderRow("Expected Annual Return", nwpReturn, setNwpReturn, 2, 25, 0.5, "%")}
                {sliderRow("Projection Range", nwpYears, setNwpYears, 5, 40, 1, " years")}
              </div>

              <div className="bento-grid" style={{ gap: 32 }}>
                <div className="bento-col-8" style={{ height: 320 }}>
                  <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={nwpData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gNwp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={THEME.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--t-muted)" }} />
                      <YAxis
                        tickFormatter={fmtINRFull}
                        tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                      />
                      <Tooltip
                        formatter={(v: any) => fmtINRFull(v)}
                        cursor={{ stroke: THEME.line }}
                        contentStyle={{
                          background: "var(--t-card-bg)",
                          borderColor: THEME.line,
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.ink }}
                        itemStyle={{ color: THEME.ink }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={THEME.accent}
                        strokeWidth={3}
                        fill="url(#gNwp)"
                      />
                    </AreaChart>
                  </ResponsiveContainer></div>
                </div>
                <div
                  className="bento-col-4"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      padding: 16,
                      background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                      borderRadius: 12,
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}
                    >
                      Starting Net Worth Today
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                      {fmtINRFull(nwpData[0]?.value)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 16,
                      background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
                      borderRadius: 12,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}
                    >
                      Projected Value in {nwpYears} Years
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: THEME.sage }}>
                      {fmtINRFull(nwpData[nwpData.length - 1]?.value)}
                    </div>
                  </div>
                  <div
                    style={{ padding: 16, border: `1.5px dashed ${THEME.line}`, borderRadius: 12 }}
                  >
                    <div
                      style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}
                    >
                      Total Growth Multiple
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: THEME.gold }}>
                      {nwpData[0]?.value > 0
                        ? `${((nwpData[nwpData.length - 1]?.value || 0) / nwpData[0].value).toFixed(1)}x Capital`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── 8. LIQUID RUNWAY & FINANCIAL STABILITY STRESS TESTER ── */}
        {calcTab === "stress" && (
          <>
            {/* Left Column: Stress Controllers */}
            <div className="bento-col-5">
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Shield size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Crisis Stress Controllers</div>
                </div>

                {/* Scenario Preset Buttons */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 8,
                    }}
                  >
                    Preset Stress Scenarios
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => {
                        setEqHaircut(15);
                        setFiHaircut(0);
                        setBurnMultiplier(1.0);
                        setOneTimeOutflow("");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${THEME.line}`,
                        background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                        color: THEME.ink,
                        fontSize: 12.5,
                        fontWeight: 600,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.accent)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--t-line)")}
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <Lock size={12} /> The Great Lockdown (Normal Crisis)
                      </span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>Inc=0 · Eq -15%</span>
                    </button>
                    <button
                      onClick={() => {
                        setEqHaircut(40);
                        setFiHaircut(10);
                        setBurnMultiplier(0.85); // 15% frugal spending reduction
                        setOneTimeOutflow("");
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${THEME.line}`,
                        background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                        color: THEME.ink,
                        fontSize: 12.5,
                        fontWeight: 600,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.accent)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--t-line)")}
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <TrendingDown size={12} /> Global Financial Crisis (Severe)
                      </span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>
                        Inc=0 · Frugal · Eq -40%
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setEqHaircut(30);
                        setFiHaircut(5);
                        setBurnMultiplier(1.0);
                        setOneTimeOutflow("500000"); // medical emergency outflow
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${THEME.line}`,
                        background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                        color: THEME.ink,
                        fontSize: 12.5,
                        fontWeight: 600,
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.accent)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--t-line)")}
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <HeartPulse size={12} /> Medical Black Swan (Outflow + Job Loss)
                      </span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>
                        Inc=0 · ₹5L Outflow · Eq -30%
                      </span>
                    </button>
                  </div>
                </div>

                <div className="divider" style={{ margin: "16px 0" }} />

                {/* Granular Sliders */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Equity Haircut */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>Equity Haircut (Stocks & MFs)</span>
                      <span style={{ color: THEME.rust, fontWeight: 800 }}>{eqHaircut}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="5"
                      value={eqHaircut}
                      onChange={(e) => setEqHaircut(Number(e.target.value))}
                      className="cxo-slider"
                    />
                  </div>

                  {/* Fixed Income Penalty */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>
                        Fixed Income Penalty (FD/Bond cashout)
                      </span>
                      <span style={{ color: THEME.gold, fontWeight: 800 }}>{fiHaircut}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={fiHaircut}
                      onChange={(e) => setFiHaircut(Number(e.target.value))}
                      className="cxo-slider"
                    />
                  </div>

                  {/* Monthly Burn Rate Multiplier */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>Crisis Burn Multiplier</span>
                      <span style={{ color: THEME.accent, fontWeight: 800 }}>
                        {burnMultiplier}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={burnMultiplier}
                      onChange={(e) => setBurnMultiplier(Number(e.target.value))}
                      className="cxo-slider"
                    />
                  </div>

                  {/* One-Time Crisis Expense */}
                  {inpRow(
                    "One-Time Emergency Cash Outflow (₹)",
                    oneTimeOutflow,
                    setOneTimeOutflow,
                    "e.g. 500000"
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Runway Metric and Stability Breakdown */}
            <div
              className="bento-col-7"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* Stability Gauge Panel */}
              <Card
                style={{
                  padding: 24,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: THEME.muted,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 12,
                  }}
                >
                  Estimated Crisis Liquidity Runway
                </div>

                {/* Big Metric Display */}
                <div
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "center",
                    margin: "16px 0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 72,
                      fontWeight: 950,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color:
                        stressResult.safetyLevel === "critical"
                          ? THEME.rust
                          : stressResult.safetyLevel === "caution"
                            ? THEME.gold
                            : stressResult.safetyLevel === "elite"
                              ? THEME.gold
                              : THEME.sage,
                    }}
                  >
                    {stressResult.runwayMonths >= 99 ? "99+" : stressResult.runwayMonths.toFixed(1)}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      marginTop: 4,
                    }}
                  >
                    Months of Runway
                  </div>
                </div>

                {/* Level Indicator Pill */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 700,
                    background:
                      stressResult.safetyLevel === "critical"
                        ? `color-mix(in srgb, ${THEME.rust} 8%, transparent)`
                        : stressResult.safetyLevel === "caution"
                          ? `color-mix(in srgb, ${THEME.gold} 8%, transparent)`
                          : stressResult.safetyLevel === "elite"
                            ? `color-mix(in srgb, ${THEME.gold} 13%, transparent)`
                            : `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                    color:
                      stressResult.safetyLevel === "critical"
                        ? THEME.rust
                        : stressResult.safetyLevel === "caution"
                          ? THEME.gold
                          : stressResult.safetyLevel === "elite"
                            ? THEME.gold
                            : THEME.sage,
                    border: `1.5px solid ${
                      stressResult.safetyLevel === "critical"
                        ? `color-mix(in srgb, ${THEME.rust} 20%, transparent)`
                        : stressResult.safetyLevel === "caution"
                          ? `color-mix(in srgb, ${THEME.gold} 20%, transparent)`
                          : stressResult.safetyLevel === "elite"
                            ? `color-mix(in srgb, ${THEME.gold} 27%, transparent)`
                            : `color-mix(in srgb, ${THEME.sage} 20%, transparent)`
                    }`,
                  }}
                >
                  {(() => {
                    const SafetyIcon =
                      stressResult.safetyLevel === "critical"
                        ? AlertCircle
                        : stressResult.safetyLevel === "caution"
                          ? AlertTriangle
                          : stressResult.safetyLevel === "elite"
                            ? Crown
                            : CheckCircle2;
                    const safetyLabel =
                      stressResult.safetyLevel === "critical"
                        ? "CRITICAL LIQUIDITY RISK"
                        : stressResult.safetyLevel === "caution"
                          ? "MODERATE RISK BUFFER"
                          : stressResult.safetyLevel === "elite"
                            ? "ELITE FINANCIAL STABILITY"
                            : "SECURE RUNWAY COVER";
                    return (
                      <>
                        <SafetyIcon size={14} style={{ flexShrink: 0 }} /> {safetyLabel}
                      </>
                    );
                  })()}
                </div>

                {/* Dynamic stress description text */}
                <p
                  style={{
                    fontSize: 13,
                    color: THEME.muted,
                    marginTop: 16,
                    lineHeight: 1.6,
                    maxWidth: 460,
                  }}
                >
                  {stressResult.safetyLevel === "critical"
                    ? "Your liquid assets cover less than 3 months of basic outflows in this crisis. Immediate cash buffers must be created or higher-haircut investments consolidated."
                    : stressResult.safetyLevel === "caution"
                      ? "You are moderately safe, but a sudden windfall reduction or larger outflow will push you into the risk zone. Consider allocating surplus income to highly liquid bank savings."
                      : stressResult.safetyLevel === "elite"
                        ? "Incredible! Your secure assets (excluding locked pension accounts) cover over a full year of active outflows. You possess superior capital cushions to withstand severe systemic downturns."
                        : "Your cash and liquid holdings cover 6 to 12 months of survival burn. Your buffer is secure, meeting the financial industry's optimal benchmark cover."}
                </p>
              </Card>

              {/* Stress Breakdown Details Card */}
              <Card style={{ padding: 22 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.06em",
                    marginBottom: 14,
                  }}
                >
                  Stress-Adjusted Liquidity Breakdown
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    {
                      label: "Stress-Adjusted Cash (Liquid Banks)",
                      base: stressResult.baseCash,
                      stressed: stressResult.stressCash,
                      color: THEME.sage,
                      hint: "No haircut",
                    },
                    {
                      label: "Stress-Adjusted Fixed Income (FD/Bonds)",
                      base: stressResult.baseFI,
                      stressed: stressResult.stressFI,
                      color: THEME.gold,
                      hint: `-${fiHaircut}% early-withdraw penalty`,
                    },
                    {
                      label: "Stress-Adjusted Equities (Stocks/MFs)",
                      base: stressResult.baseEquity,
                      stressed: stressResult.stressEquity,
                      color: THEME.accent,
                      hint: `-${eqHaircut}% market haircut`,
                    },
                  ].map(({ label, base, stressed, color, hint }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                        paddingBottom: 8,
                        borderBottom: `1px dashed ${THEME.line}`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: THEME.ink }}>{label}</div>
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          Current: {fmtINRFull(base)} · <span style={{ color }}>{hint}</span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                        {fmtINRFull(stressed)}
                      </span>
                    </div>
                  ))}

                  {/* Summary of totals */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                      paddingTop: 6,
                      fontWeight: 800,
                    }}
                  >
                    <span style={{ color: THEME.muted }}>Total Stress-Adjusted Assets</span>
                    <span style={{ color: THEME.ink }}>
                      {fmtINRFull(stressResult.totalLiquidAssets)}
                    </span>
                  </div>

                  {Number(oneTimeOutflow) > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                        fontWeight: 800,
                        color: THEME.rust,
                      }}
                    >
                      <span style={{ color: THEME.rust }}>Emergency Cash Outflow (-)</span>
                      <span>{fmtINRFull(Number(oneTimeOutflow))}</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      borderTop: `1.5px solid ${THEME.line}`,
                      paddingTop: 10,
                    }}
                  >
                    <span style={{ color: THEME.muted }}>Net Stressed Capital Buffer</span>
                    <span style={{ color: THEME.sage, fontSize: 15 }}>
                      {fmtINRFull(stressResult.netStressAssets)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    <span style={{ color: THEME.muted }}>Stress-Adjusted Monthly Burn Rate</span>
                    <span style={{ color: THEME.rust, fontSize: 14 }}>
                      {fmtINRFull(stressResult.crisisBurnRate)}/mo
                    </span>
                  </div>
                  <div
                    style={{ fontSize: 11, color: THEME.muted, textAlign: "right", marginTop: -6 }}
                  >
                    Expense ({fmtINRFull(stressResult.monthlyExpense)} × {burnMultiplier}x) + EMIs (
                    {fmtINRFull(stressResult.activeEMIs)}/mo)
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {calcTab === "monte-carlo" && monteCarloResult && (
          <>
            <div className="bento-col-5">
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Sparkles size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Stochastic Parameters</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {inpRow("Current Age", fireAge, setFireAge)}
                  {inpRow("Retirement Age", fireRetireAge, setFireRetireAge)}
                </div>
                {inpRow("Current Expenses (₹/mo)", fireExpense, setFireExpense)}
                {inpRow("Retirement Corpus (₹)", firePortfolio, setFirePortfolio)}

                <div className="divider" style={{ margin: "20px 0 16px" }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 12 }}>
                  Economic & Risk Assumptions
                </div>

                {sliderRow("Inflation Rate", fireInflation, setFireInflation, 1, 15, 0.5, "%")}
                {sliderRow(
                  "Post-Retire Return (Mean)",
                  firePostReturn,
                  setFirePostReturn,
                  4,
                  18,
                  0.5,
                  "%"
                )}
                {sliderRow(
                  "Portfolio Volatility (Std Dev)",
                  monteVolatility,
                  setMonteVolatility,
                  2,
                  25,
                  0.5,
                  "%"
                )}
                {sliderRow(
                  "Planned Life Expectancy",
                  fireLifeExp,
                  setFireLifeExp,
                  60,
                  100,
                  1,
                  " yrs"
                )}
              </Card>
            </div>

            <div
              className="bento-col-7"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* SUCCESS SCORE CARD */}
              {(() => {
                const score = monteCarloResult.successProbability;
                const statusColor =
                  score >= 80 ? THEME.sage : score >= 50 ? THEME.gold : THEME.rust;
                const statusText =
                  score >= 80
                    ? "High Success Rate"
                    : score >= 50
                      ? "Moderate Sequence Risk"
                      : "High Failure Risk";

                return (
                  <Card style={{ padding: 24, borderTop: `4px solid ${statusColor}` }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 14,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: THEME.muted,
                          }}
                        >
                          FIRE Longevity Success Score
                        </div>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 800,
                            marginTop: 4,
                            color: statusColor,
                          }}
                        >
                          {score.toFixed(1)}% Success
                        </div>
                      </div>
                      <Badge
                        variant={score >= 80 ? "sage" : score >= 50 ? "gold" : "rust"}
                        style={{ fontSize: 11, fontWeight: 800 }}
                      >
                        {statusText}
                      </Badge>
                    </div>

                    <div className="progress-track" style={{ marginBottom: 12 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${score}%`,
                          background: statusColor,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>

                    <div style={{ fontSize: 12.5, color: THEME.muted, lineHeight: 1.5 }}>
                      <Clock
                        size={12}
                        style={{ verticalAlign: -2, marginRight: 2, flexShrink: 0 }}
                      />{" "}
                      Out of <b>500 randomized market sequences</b>, your portfolio survived
                      standard withdrawals in <b>{Math.round(score * 5)}</b> runs. On average, your
                      assets will sustain you for{" "}
                      <b>{monteCarloResult.avgYearsLasted.toFixed(1)} years</b> out of your{" "}
                      <b>{monteCarloResult.yrsInRet} planned years</b> in retirement.
                    </div>
                  </Card>
                );
              })()}

              {/* DYNAMIC PROBABILITY BAND CHART */}
              <Card style={{ padding: 24 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.05em",
                    marginBottom: 16,
                  }}
                >
                  Monte Carlo Wealth Projections (Probability Bands)
                </div>

                <div style={{ height: 260 }}>
                  <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                      data={monteCarloResult.chartData}
                      margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="bestColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={THEME.sage} stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="expectedColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={THEME.gold} stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="worstColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME.rust} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={THEME.rust} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} vertical={false} />
                      <XAxis dataKey="year" stroke={THEME.muted} fontSize={11} tickLine={false} />
                      <YAxis
                        stroke={THEME.muted}
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => fmtINRFull(v)}
                      />
                      <Tooltip
                        cursor={{ stroke: THEME.line }}
                        contentStyle={{
                          background: THEME.paper,
                          border: `1.5px solid ${THEME.line}`,
                          borderRadius: 10,
                          fontSize: 12,
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.ink }}
                        itemStyle={{ color: THEME.ink }}
                        formatter={(val) => fmtINRFull(Number(val))}
                      />
                      <Area
                        type="monotone"
                        dataKey="Best Case (90th %)"
                        stroke={THEME.sage}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#bestColor)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Expected Case (50th %)"
                        stroke={THEME.gold}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#expectedColor)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Worst Case (10th %)"
                        stroke={THEME.rust}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#worstColor)"
                      />
                      <ReferenceLine
                        y={0}
                        stroke={THEME.rust}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                    </AreaChart>
                  </ResponsiveContainer></div>
                </div>
              </Card>

              {/* CFO STOCHASTIC ADVISORY CARD */}
              <Card style={{ padding: 20, borderTop: `4px solid ${THEME.accent}` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Info size={18} color={THEME.accent} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{ fontWeight: 800, fontSize: 13.5, color: THEME.ink, marginBottom: 6 }}
                    >
                      Sequence of Returns Risk (CFO Advisory)
                    </h4>
                    <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: 0 }}>
                      Stochastic models fluctuate annual post-retirement returns based on standard
                      deviations (volatility). Even if your average return satisfies standard FIRE
                      requirements, experiencing negative returns in the **first 3-5 years** of
                      retirement can permanently deplete your portfolio. Aim for a Success Score
                      **above 85%** to survive worst-case historical sequence risks.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── 10. EXECUTIVE WEALTH SCENARIO PLANNER & SANDBOX (RELEASE 6) ── */}
        {calcTab === "scenario-sandbox" && sandboxResult && (
          <>
            {/* Left Column: Sandbox Configurator Console */}
            <div
              className="bento-col-5"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <GitBranch size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Scenario Configurator</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {inpRow("Current Age", fireAge, setFireAge)}
                  {inpRow("Target Corpus (₹)", firePortfolio, setFirePortfolio)}
                </div>
                {inpRow("Base Monthly Savings (₹)", sandboxSavings, setSandboxSavings)}

                <div className="divider" style={{ margin: "16px 0" }} />

                {sliderRow(
                  "Assumed Portfolio Return",
                  sandboxReturn,
                  setSandboxReturn,
                  2,
                  22,
                  0.5,
                  "%"
                )}
                {sliderRow("Simulation Duration", sandboxYears, setSandboxYears, 5, 25, 1, " yrs")}

                <div className="divider" style={{ margin: "20px 0 16px" }} />
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: THEME.muted,
                    letterSpacing: "0.05em",
                    marginBottom: 16,
                  }}
                >
                  Alternative Life Presets
                </div>

                {/* Preset 1: Career Gap / Sabbatical Accordion Card */}
                <div
                  style={{
                    background: `color-mix(in srgb, ${THEME.muted} 2%, transparent)`,
                    border: `1.5px solid ${sabActive ? THEME.accent : THEME.line}`,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 14,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Plane size={17} color={THEME.ink} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                        Career Sabbatical
                      </span>
                    </div>
                    <label
                      className="switch"
                      style={{
                        position: "relative",
                        display: "inline-block",
                        width: 34,
                        height: 20,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={sabActive}
                        onChange={(e) => setSabActive(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        className="slider round"
                        style={{
                          position: "absolute",
                          cursor: "pointer",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: sabActive ? THEME.accent : THEME.line,
                          borderRadius: 34,
                          transition: "0.3s",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            content: "",
                            height: 14,
                            width: 14,
                            left: 3,
                            bottom: 3,
                            backgroundColor: "white",
                            borderRadius: "50%",
                            transition: "0.3s",
                            transform: sabActive ? "translateX(14px)" : "none",
                          }}
                        />
                      </span>
                    </label>
                  </div>
                  {sabActive && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        animation: "fadeInUp 0.25s ease",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {inpRow("Start Age", sabAge, setSabAge)}
                        {inpRow("Duration (yrs)", sabDur, setSabDur)}
                      </div>
                      {sliderRow("Income Factor during Gap", sabInc, setSabInc, 0, 100, 5, "%")}
                      {inpRow("Extra Expenses (₹/mo)", sabExp, setSabExp)}
                    </div>
                  )}
                </div>

                {/* Preset 2: Startup Venture Accordion Card */}
                <div
                  style={{
                    background: `color-mix(in srgb, ${THEME.muted} 2%, transparent)`,
                    border: `1.5px solid ${startupActive ? THEME.gold : THEME.line}`,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 14,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Rocket size={17} color={THEME.ink} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                        Startup Venture
                      </span>
                    </div>
                    <label
                      className="switch"
                      style={{
                        position: "relative",
                        display: "inline-block",
                        width: 34,
                        height: 20,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={startupActive}
                        onChange={(e) => setStartupActive(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        className="slider round"
                        style={{
                          position: "absolute",
                          cursor: "pointer",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: startupActive ? THEME.gold : THEME.line,
                          borderRadius: 34,
                          transition: "0.3s",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            content: "",
                            height: 14,
                            width: 14,
                            left: 3,
                            bottom: 3,
                            backgroundColor: "white",
                            borderRadius: "50%",
                            transition: "0.3s",
                            transform: startupActive ? "translateX(14px)" : "none",
                          }}
                        />
                      </span>
                    </label>
                  </div>
                  {startupActive && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        animation: "fadeInUp 0.25s ease",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {inpRow("Launch Age", startupAge, setStartupAge)}
                        {inpRow("Launch CapEx (₹)", startupCapEx, setStartupCapEx)}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {inpRow("Salary Loss (yrs)", startupLoss, setStartupLoss)}
                        {inpRow("Exit Pay Age", startupPayoutAge, setStartupPayoutAge)}
                      </div>
                      {inpRow("Projected Exit Pay (₹)", startupPayout, setStartupPayout)}
                    </div>
                  )}
                </div>

                {/* Preset 3: Real Estate Purchase Accordion Card */}
                <div
                  style={{
                    background: `color-mix(in srgb, ${THEME.muted} 2%, transparent)`,
                    border: `1.5px solid ${propActive ? THEME.rust : THEME.line}`,
                    borderRadius: 12,
                    padding: 16,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Home size={17} color={THEME.ink} />
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                        Real Estate Purchase
                      </span>
                    </div>
                    <label
                      className="switch"
                      style={{
                        position: "relative",
                        display: "inline-block",
                        width: 34,
                        height: 20,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={propActive}
                        onChange={(e) => setPropActive(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        className="slider round"
                        style={{
                          position: "absolute",
                          cursor: "pointer",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: propActive ? THEME.rust : THEME.line,
                          borderRadius: 34,
                          transition: "0.3s",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            content: "",
                            height: 14,
                            width: 14,
                            left: 3,
                            bottom: 3,
                            backgroundColor: "white",
                            borderRadius: "50%",
                            transition: "0.3s",
                            transform: propActive ? "translateX(14px)" : "none",
                          }}
                        />
                      </span>
                    </label>
                  </div>
                  {propActive && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        animation: "fadeInUp 0.25s ease",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {inpRow("Purchase Age", propAge, setPropAge)}
                        {inpRow("Down Payment (₹)", propDown, setPropDown)}
                      </div>
                      {inpRow("Annual Carry Costs (₹)", propCarry, setPropCarry)}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Comparative Dashboard Analytics */}
            <div
              className="bento-col-7"
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              {/* COMPARATIVE SCORECARD */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                }}
              >
                <Card style={{ padding: 18 }}>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: THEME.muted,
                    }}
                  >
                    10-Yr Baseline Wealth
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginTop: 4 }}>
                    {fmtINRFull(
                      sandboxResult.chartData[Math.min(10, sandboxResult.chartData.length - 1)][
                        "Baseline Path"
                      ]
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 4 }}>
                    Est. FI Target Age: <b>{sandboxResult.baseFIAge} yrs</b>
                  </div>
                </Card>

                <Card style={{ padding: 18 }}>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: THEME.muted,
                    }}
                  >
                    10-Yr Sandbox Wealth
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color:
                        sandboxResult.endSand >= sandboxResult.endBase ? THEME.sage : THEME.ink,
                      marginTop: 4,
                    }}
                  >
                    {fmtINRFull(
                      sandboxResult.chartData[Math.min(10, sandboxResult.chartData.length - 1)][
                        "Simulated Path"
                      ]
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 4 }}>
                    Est. FI Target Age: <b>{sandboxResult.sandFIAge} yrs</b>
                  </div>
                </Card>

                <Card style={{ padding: 18 }}>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: THEME.muted,
                    }}
                  >
                    Net Scenario Drag / Benefit
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: sandboxResult.oppCost > 0 ? THEME.rust : THEME.sage,
                      marginTop: 4,
                    }}
                  >
                    {sandboxResult.oppCost > 0
                      ? `-${fmtINRFull(Math.abs(sandboxResult.oppCost))}`
                      : `+${fmtINRFull(Math.abs(sandboxResult.oppCost))}`}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10.5,
                      color: sandboxResult.oppCost > 0 ? THEME.rust : THEME.sage,
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {sandboxResult.oppCost > 0 ? (
                      <>
                        <Clock size={11} /> Delay: +{sandboxResult.fiAgeGap.toFixed(1)} yrs to FI
                      </>
                    ) : (
                      <>
                        <Rocket size={11} /> Accelerated by{" "}
                        {Math.abs(sandboxResult.fiAgeGap).toFixed(1)} yrs
                      </>
                    )}
                  </div>
                </Card>
              </div>

              {/* INTEGRATED COMPARISON CHART */}
              <Card style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      color: THEME.muted,
                      letterSpacing: "0.05em",
                    }}
                  >
                    Wealth Projections Sandbox Overlay
                  </div>
                  {sandboxResult.liquidityCrisisAge !== -1 && (
                    <Badge variant="rust" style={{ animation: "pulse-ring 2s infinite" }}>
                      <AlertTriangle size={11} /> Liquidity Shortfall at age{" "}
                      {sandboxResult.liquidityCrisisAge}
                    </Badge>
                  )}
                </div>

                <div style={{ height: 260 }}>
                  <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                      data={sandboxResult.chartData}
                      margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="baselineColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={THEME.accent} stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="sandboxColor" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={sandboxResult.oppCost > 0 ? THEME.gold : THEME.sage}
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="95%"
                            stopColor={sandboxResult.oppCost > 0 ? THEME.gold : THEME.sage}
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} vertical={false} />
                      <XAxis dataKey="age" stroke={THEME.muted} fontSize={11} tickLine={false} />
                      <YAxis
                        stroke={THEME.muted}
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => fmtINRFull(v)}
                      />
                      <Tooltip
                        cursor={{ stroke: THEME.line }}
                        contentStyle={{
                          background: THEME.paper,
                          border: `1.5px solid ${THEME.line}`,
                          borderRadius: 10,
                          fontSize: 12,
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.ink }}
                        itemStyle={{ color: THEME.ink }}
                        formatter={(val) => fmtINRFull(Number(val))}
                      />
                      <Area
                        type="monotone"
                        dataKey="Baseline Path"
                        stroke={THEME.accent}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#baselineColor)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Simulated Path"
                        stroke={sandboxResult.oppCost > 0 ? THEME.gold : THEME.sage}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#sandboxColor)"
                      />
                      <ReferenceLine
                        y={0}
                        stroke={THEME.rust}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                    </AreaChart>
                  </ResponsiveContainer></div>
                </div>
              </Card>

              {/* CEO / CFO STRATEGIC ADVISORY */}
              <Card style={{ padding: 20, borderTop: `4px solid ${THEME.gold}` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Info size={18} color={THEME.gold} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{ fontWeight: 800, fontSize: 13.5, color: THEME.ink, marginBottom: 6 }}
                    >
                      Strategic Sandboxing (CEO & CFO Executive Briefing)
                    </h4>
                    <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: 0 }}>
                      {sandboxResult.oppCost > 0 ? (
                        <>
                          Your simulated scenario has an opportunity cost of{" "}
                          <b>{fmtINRFull(Math.abs(sandboxResult.oppCost))}</b>. This introduces a{" "}
                          <b>{sandboxResult.fiAgeGap.toFixed(1)} year delay</b> to reaching your
                          Financial Independence target.
                          {sandboxResult.liquidityCrisisAge !== -1 ? (
                            <span style={{ color: THEME.rust, fontWeight: 700 }}>
                              {" "}
                              WARNING: Outstanding liabilities/downpayments trigger a liquidity
                              crisis at age {sandboxResult.liquidityCrisisAge}. We advise securing a
                              capital buffer of at least 6 months of baseline expenses before
                              initiating this choice.
                            </span>
                          ) : (
                            " Ensure your emergency fund scales to absorb the increased annual carry costs before execution."
                          )}
                        </>
                      ) : (
                        <>
                          Your simulated venture compounds wealth{" "}
                          <b>{fmtINRFull(Math.abs(sandboxResult.oppCost))}</b> above your baseline
                          projection! This accelerates your Financial Independence target age by{" "}
                          <b>{Math.abs(sandboxResult.fiAgeGap).toFixed(1)} years</b>, easily
                          offsetting any initial CapEx risk.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ── INDEXATION BENEFIT CALCULATOR ── */}
        {calcTab === "indexation" && (
          <>
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Coins size={18} color={THEME.gold} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Indexation Parameters</div>
                </div>

                {inpRow("Purchase Price (₹)", idxPurchasePrice, setIdxPurchasePrice)}

                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}
                  >
                    Purchase Year (FY)
                  </div>
                  <select
                    value={idxPurchaseYear}
                    onChange={(e) => setIdxPurchaseYear(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--t-card-bg)",
                      border: `1.5px solid ${THEME.line}`,
                      borderRadius: 10,
                      color: THEME.ink,
                      fontSize: 14,
                    }}
                  >
                    {CII_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        FY {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {inpRow("Sale Price (₹)", idxSalePrice, setIdxSalePrice)}

                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}
                  >
                    Sale Year (FY)
                  </div>
                  <select
                    value={idxSaleYear}
                    onChange={(e) => setIdxSaleYear(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--t-card-bg)",
                      border: `1.5px solid ${THEME.line}`,
                      borderRadius: 10,
                      color: THEME.ink,
                      fontSize: 14,
                    }}
                  >
                    {CII_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        FY {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}
                  >
                    Asset Type
                  </div>
                  <select
                    value={idxAssetType}
                    onChange={(e) => setIdxAssetType(e.target.value as any)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--t-card-bg)",
                      border: `1.5px solid ${THEME.line}`,
                      borderRadius: 10,
                      color: THEME.ink,
                      fontSize: 14,
                    }}
                  >
                    {["Debt MF", "Property", "Gold/Bonds", "Other"].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget 2024 info note */}
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    background: `color-mix(in srgb, ${THEME.gold} 7%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
                    borderRadius: 10,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <Info size={14} color={THEME.gold} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.5 }}>
                    <b>Budget 2024 Note:</b> Indexation benefit was removed for most asset classes
                    for purchases made after April 2023. This calculator applies to assets purchased
                    before that cutoff date, where the old LTCG regime with indexation still
                    applies.
                  </div>
                </div>
              </Card>
            </div>

            <div className="bento-col-8">
              <Card style={{ padding: 24 }}>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 20 }}
                >
                  Indexation Benefit Analysis
                </div>

                {/* Side-by-side comparison cards */}
                <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                  {/* Without Indexation */}
                  <div
                    style={{
                      flex: "1 1 200px",
                      padding: 20,
                      background: `color-mix(in srgb, ${THEME.rust} 3%, transparent)`,
                      borderRadius: 12,
                      border: `1px solid color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                    }}
                  >
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: THEME.rust, marginBottom: 14 }}
                    >
                      Without Indexation
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: `1px dashed ${THEME.line}`,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: THEME.muted, fontWeight: 500 }}>Capital Gain</span>
                      <span style={{ fontWeight: 700, color: THEME.ink }}>
                        {fmtINRFull(idxResult.gainWithout)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: THEME.muted, fontWeight: 500 }}>Tax @ 20%</span>
                      <span style={{ fontWeight: 800, color: THEME.rust, fontSize: 16 }}>
                        {fmtINRFull(idxResult.taxWithout)}
                      </span>
                    </div>
                  </div>

                  {/* With Indexation */}
                  <div
                    style={{
                      flex: "1 1 200px",
                      padding: 20,
                      background: `color-mix(in srgb, ${THEME.sage} 3%, transparent)`,
                      borderRadius: 12,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 15%, transparent)`,
                    }}
                  >
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: THEME.sage, marginBottom: 14 }}
                    >
                      With Indexation
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: `1px dashed ${THEME.line}`,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: THEME.muted, fontWeight: 500 }}>CII (Purchase)</span>
                      <span style={{ fontWeight: 700, color: THEME.ink }}>
                        {idxResult.ciiPurchase}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: `1px dashed ${THEME.line}`,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: THEME.muted, fontWeight: 500 }}>CII (Sale)</span>
                      <span style={{ fontWeight: 700, color: THEME.ink }}>{idxResult.ciiSale}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: `1px dashed ${THEME.line}`,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: THEME.muted, fontWeight: 500 }}>Indexed Cost</span>
                      <span style={{ fontWeight: 700, color: THEME.sage }}>
                        {fmtINRFull(idxResult.indexedCost)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: `1px dashed ${THEME.line}`,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: THEME.muted, fontWeight: 500 }}>Indexed Gain</span>
                      <span style={{ fontWeight: 700, color: THEME.ink }}>
                        {fmtINRFull(idxResult.gainWith)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: THEME.muted, fontWeight: 500 }}>Tax @ 20%</span>
                      <span style={{ fontWeight: 800, color: THEME.sage, fontSize: 16 }}>
                        {fmtINRFull(idxResult.taxWith)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tax Savings highlight */}
                <div
                  style={{
                    padding: 20,
                    background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                    borderRadius: 12,
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 19%, transparent)`,
                    marginBottom: 24,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginBottom: 4 }}
                    >
                      Tax Saved via Indexation
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: THEME.sage }}>
                      {fmtINRFull(idxResult.taxSaved)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginBottom: 4 }}
                    >
                      Effective Tax Rate
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: THEME.accent }}>
                      {idxResult.effectiveTaxRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      vs 20% without indexation
                    </div>
                  </div>
                </div>

                {/* Bar Chart: Purchase Price vs Indexed Cost vs Sale Price */}
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: THEME.muted, marginBottom: 12 }}
                >
                  Cost Comparison
                </div>
                <div style={{ width: "100%", height: 220, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={idxBarData} barSize={48}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${THEME.line}`} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: THEME.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: THEME.muted }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => fmtINRFull(v)}
                    />
                    <Tooltip
                      formatter={(v: number) => fmtINRFull(v)}
                      cursor={{ fill: THEME.line, opacity: 0.4 }}
                      contentStyle={{
                        background: "var(--t-card-bg)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 10,
                        fontSize: 12,
                        color: THEME.ink,
                      }}
                      labelStyle={{ color: THEME.ink }}
                      itemStyle={{ color: THEME.ink }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {idxBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer></div>
              </Card>
            </div>
          </>
        )}

        {/* ── RETIREMENT INCOME PLANNER ── */}
        {calcTab === "retirement-income" && riResult && (
          <>
            {/* Inputs Panel */}
            <div className="bento-col-4">
              <Card style={{ padding: 24, height: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Briefcase size={18} color={THEME.accent} />
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Retirement Parameters</div>
                </div>
                {inpRow("Current Age", riCurrentAge, setRiCurrentAge)}
                {inpRow("Retirement Age", riRetireAge, setRiRetireAge)}
                {inpRow("Life Expectancy", riLifeExp, setRiLifeExp)}
                {sliderRow("Inflation Rate", riInflation, setRiInflation, 1, 12, 0.5, "%")}
                {inpRow("Monthly Expenses Today (₹)", riMonthlyExp, setRiMonthlyExp)}

                {/* Adequacy Indicator */}
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 12,
                    background:
                      riResult.adequacy === "green"
                        ? `color-mix(in srgb, ${THEME.sage} 9%, transparent)`
                        : riResult.adequacy === "yellow"
                          ? `color-mix(in srgb, ${THEME.gold} 9%, transparent)`
                          : `color-mix(in srgb, ${THEME.rust} 9%, transparent)`,
                    border: `1.5px solid ${
                      riResult.adequacy === "green"
                        ? THEME.sage
                        : riResult.adequacy === "yellow"
                          ? THEME.gold
                          : THEME.rust
                    }`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {riResult.adequacy === "green" ? (
                      <CheckCircle2 size={18} color={THEME.sage} />
                    ) : riResult.adequacy === "yellow" ? (
                      <AlertTriangle size={18} color={THEME.gold} />
                    ) : (
                      <AlertTriangle size={18} color={THEME.rust} />
                    )}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color:
                          riResult.adequacy === "green"
                            ? THEME.sage
                            : riResult.adequacy === "yellow"
                              ? THEME.gold
                              : THEME.rust,
                      }}
                    >
                      {riResult.adequacy === "green"
                        ? "Fully Covered"
                        : riResult.adequacy === "yellow"
                          ? "Partially Covered"
                          : "Significant Shortfall"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.5 }}>
                    {riResult.adequacy === "green"
                      ? "Your income sources cover 100%+ of expenses throughout retirement."
                      : riResult.adequacy === "yellow"
                        ? `Income covers expenses initially but falls short at age ${riResult.firstDeficitAge}.`
                        : "Income doesn't cover expenses even at retirement. You need additional corpus."}
                  </div>
                </div>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="bento-col-8">
              <Card style={{ padding: 24, marginBottom: 20 }}>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 16 }}
                >
                  Summary at Retirement
                </div>
                <div className="bento-grid" style={{ gap: 16 }}>
                  <div className="bento-col-6">
                    <div
                      style={{
                        padding: 18,
                        background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                        borderRadius: 12,
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      {resultRow(
                        "Monthly Income at Retirement",
                        riResult.totalIncomeAtRetire,
                        true,
                        THEME.sage
                      )}
                      {resultRow(
                        "Inflation-Adjusted Expense",
                        riResult.inflatedExpAtRetire,
                        false,
                        THEME.gold
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "10px 0",
                          borderBottom: `1px dashed ${THEME.line}`,
                          fontSize: 14,
                        }}
                      >
                        <span style={{ color: THEME.muted, fontWeight: 500 }}>
                          {riResult.surplusAtRetire >= 0 ? "Surplus" : "Deficit"} at Retirement
                        </span>
                        <span
                          style={{
                            fontWeight: 900,
                            color: riResult.surplusAtRetire >= 0 ? THEME.sage : THEME.rust,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {riResult.surplusAtRetire >= 0 ? "+" : "-"}
                          {fmtINRFull(Math.abs(riResult.surplusAtRetire))}
                        </span>
                      </div>
                      {riResult.firstDeficitAge > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "10px 0",
                            borderBottom: `1px dashed ${THEME.line}`,
                            fontSize: 14,
                          }}
                        >
                          <span style={{ color: THEME.muted, fontWeight: 500 }}>
                            Income Falls Below Expenses
                          </span>
                          <span
                            style={{
                              fontWeight: 800,
                              color: THEME.rust,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            Age {riResult.firstDeficitAge}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bento-col-6">
                    {riResult.corpusNeeded > 0 ? (
                      <div
                        style={{
                          padding: 18,
                          background: `color-mix(in srgb, ${THEME.rust} 5%, transparent)`,
                          borderRadius: 12,
                          border: `1.5px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
                          height: "100%",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: THEME.rust,
                            marginBottom: 10,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          Corpus Needed to Fill the Gap
                        </div>
                        <div
                          style={{
                            fontSize: 28,
                            fontWeight: 900,
                            color: THEME.ink,
                            letterSpacing: "-0.04em",
                            marginBottom: 8,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtINRFull(riResult.corpusNeeded)}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.6 }}>
                          Start a monthly SIP of{" "}
                          <strong style={{ color: THEME.accent }}>
                            {fmtINRFull(riResult.monthlySIPNeeded)}
                          </strong>{" "}
                          at 12% return to build this corpus by retirement.
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: 18,
                          background: `color-mix(in srgb, ${THEME.sage} 5%, transparent)`,
                          borderRadius: 12,
                          border: `1.5px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          textAlign: "center",
                        }}
                      >
                        <CheckCircle2 size={32} color={THEME.sage} />
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: THEME.sage,
                            marginTop: 10,
                          }}
                        >
                          No Additional Corpus Needed
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: THEME.muted,
                            marginTop: 6,
                            lineHeight: 1.5,
                          }}
                        >
                          Your planned income sources cover all retirement expenses throughout your
                          lifetime.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Income Timeline Chart */}
              <Card style={{ padding: 24, marginBottom: 20 }}>
                <div
                  style={{ fontSize: 14, fontWeight: 700, color: THEME.muted, marginBottom: 16 }}
                >
                  Income vs Expenses Timeline
                </div>
                <div style={{ width: "100%", height: 340, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={riResult.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${THEME.line}`} />
                    <XAxis
                      dataKey="age"
                      tick={{ fontSize: 11, fill: THEME.muted }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Age",
                        position: "insideBottomRight",
                        offset: -5,
                        fontSize: 11,
                        fill: THEME.muted,
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: THEME.muted }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => fmtINRFull(v)}
                    />
                    <Tooltip
                      formatter={(v: number, name: string) => [fmtINRFull(v), name]}
                      cursor={{ stroke: THEME.line }}
                      contentStyle={{
                        background: "var(--t-card-bg)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 10,
                        fontSize: 12,
                        color: THEME.ink,
                      }}
                      labelStyle={{ color: THEME.ink }}
                      itemStyle={{ color: THEME.ink }}
                      labelFormatter={(age: number) => `Age ${age}`}
                    />
                    <Legend verticalAlign="top" height={36} />
                    {riSources.map((src, i) => {
                      const colors = [THEME.accent, THEME.sage, THEME.gold, "#8B5CF6", "#EC4899"];
                      return (
                        <Area
                          key={src.name}
                          type="monotone"
                          dataKey={src.name}
                          stackId="income"
                          stroke={colors[i % colors.length]}
                          fill={colors[i % colors.length]}
                          fillOpacity={0.4}
                        />
                      );
                    })}
                    <Area
                      type="monotone"
                      dataKey="inflatedExpense"
                      name="Inflation-Adjusted Expenses"
                      stroke={THEME.rust}
                      fill="none"
                      strokeWidth={2.5}
                      strokeDasharray="8 4"
                    />
                  </AreaChart>
                </ResponsiveContainer></div>
              </Card>

              {/* Income Sources Table */}
              <Card style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.muted }}>
                    Income Sources
                  </div>
                  <button
                    onClick={() =>
                      setRiSources((prev) => [
                        ...prev,
                        { name: "New Source", monthly: 10000, startAge: 60, endAge: 85, growth: 0 },
                      ])
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      background: THEME.accent,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={14} /> Add Source
                  </button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                      minWidth: 600,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: `2px solid ${THEME.line}`,
                          textAlign: "left",
                        }}
                      >
                        <th
                          style={{
                            padding: "8px 6px",
                            color: THEME.muted,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          Source Name
                        </th>
                        <th
                          style={{
                            padding: "8px 6px",
                            color: THEME.muted,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          Monthly (₹)
                        </th>
                        <th
                          style={{
                            padding: "8px 6px",
                            color: THEME.muted,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          Start Age
                        </th>
                        <th
                          style={{
                            padding: "8px 6px",
                            color: THEME.muted,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          End Age
                        </th>
                        <th
                          style={{
                            padding: "8px 6px",
                            color: THEME.muted,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          Growth %
                        </th>
                        <th style={{ padding: "8px 6px", width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {riSources.map((src, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                          }}
                        >
                          <td style={{ padding: "6px" }}>
                            <input
                              type="text"
                              value={src.name}
                              aria-label={`Income source ${idx + 1} name`}
                              onChange={(e) => {
                                const next = [...riSources];
                                next[idx] = { ...next[idx], name: e.target.value };
                                setRiSources(next);
                              }}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                background: "var(--t-card-bg)",
                                border: `1px solid ${THEME.line}`,
                                borderRadius: 6,
                                color: THEME.ink,
                                fontSize: 12,
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px" }}>
                            <input
                              type="number"
                              value={src.monthly}
                              aria-label={`${src.name || "Income source"} monthly amount`}
                              onChange={(e) => {
                                const next = [...riSources];
                                next[idx] = { ...next[idx], monthly: Number(e.target.value) || 0 };
                                setRiSources(next);
                              }}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                background: "var(--t-card-bg)",
                                border: `1px solid ${THEME.line}`,
                                borderRadius: 6,
                                color: THEME.ink,
                                fontSize: 12,
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px" }}>
                            <input
                              type="number"
                              value={src.startAge}
                              aria-label={`${src.name || "Income source"} start age`}
                              onChange={(e) => {
                                const next = [...riSources];
                                next[idx] = { ...next[idx], startAge: Number(e.target.value) || 0 };
                                setRiSources(next);
                              }}
                              style={{
                                width: 60,
                                padding: "6px 8px",
                                background: "var(--t-card-bg)",
                                border: `1px solid ${THEME.line}`,
                                borderRadius: 6,
                                color: THEME.ink,
                                fontSize: 12,
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px" }}>
                            <input
                              type="number"
                              value={src.endAge}
                              aria-label={`${src.name || "Income source"} end age`}
                              onChange={(e) => {
                                const next = [...riSources];
                                next[idx] = { ...next[idx], endAge: Number(e.target.value) || 0 };
                                setRiSources(next);
                              }}
                              style={{
                                width: 60,
                                padding: "6px 8px",
                                background: "var(--t-card-bg)",
                                border: `1px solid ${THEME.line}`,
                                borderRadius: 6,
                                color: THEME.ink,
                                fontSize: 12,
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px" }}>
                            <input
                              type="number"
                              value={src.growth}
                              aria-label={`${src.name || "Income source"} annual growth percent`}
                              onChange={(e) => {
                                const next = [...riSources];
                                next[idx] = { ...next[idx], growth: Number(e.target.value) || 0 };
                                setRiSources(next);
                              }}
                              style={{
                                width: 60,
                                padding: "6px 8px",
                                background: "var(--t-card-bg)",
                                border: `1px solid ${THEME.line}`,
                                borderRadius: 6,
                                color: THEME.ink,
                                fontSize: 12,
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px", textAlign: "center" }}>
                            <button
                              onClick={() =>
                                setRiSources((prev) => prev.filter((_, i) => i !== idx))
                              }
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: THEME.rust,
                                padding: 4,
                              }}
                              title="Remove source"
                              aria-label={`Remove ${src.label || "income source"}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
