// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  CreditCard,
  Target,
  Calendar,
  PieChart as PieIcon,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Building2,
  Landmark,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Zap,
  ShieldAlert,
  BarChart2,
  Activity,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { fmtINR, fmtINRFull, getCCDueDate, rdMaturity } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { MonthlyReportModal } from "../modals/MonthlyReportModal";
import { Modal } from "../ui/Modal";
import { SectionTitle } from "../ui/SectionTitle";
import { StockLogo } from "./DematTab";
import { Prv } from "../../context/PrivacyContext";

// ─── BADGE CATALOG ───────────────────────────────────────────────────────────
// Each category is a sequential tier chain. Badges unlock when the previous tier
// in the same category is earned. Standalone badges (tier 1 only) are always "active".
const BADGE_CATALOG = [
  // Savings Streak
  {
    id: "s1",
    cat: "Savings Streak",
    tier: 1,
    icon: "✅",
    label: "First Win",
    desc: "Save more than you spend for 1 month",
  },
  {
    id: "s3",
    cat: "Savings Streak",
    tier: 2,
    icon: "⚡",
    label: "On a Roll",
    desc: "3-month savings streak",
  },
  {
    id: "s6",
    cat: "Savings Streak",
    tier: 3,
    icon: "🔥",
    label: "Fire Saver",
    desc: "6 consecutive months of net saving",
  },
  {
    id: "s12",
    cat: "Savings Streak",
    tier: 4,
    icon: "🏆",
    label: "Savings Champion",
    desc: "12-month savings streak",
  },
  {
    id: "s24",
    cat: "Savings Streak",
    tier: 5,
    icon: "👑",
    label: "Legendary Saver",
    desc: "24 months of consistent saving",
  },
  // Wealth Builder
  {
    id: "w1",
    cat: "Wealth Builder",
    tier: 1,
    icon: "🌱",
    label: "₹1L Club",
    desc: "Net worth crossed ₹1 Lakh",
  },
  {
    id: "w5",
    cat: "Wealth Builder",
    tier: 2,
    icon: "🌿",
    label: "₹5L Club",
    desc: "Net worth crossed ₹5 Lakh",
  },
  {
    id: "w10",
    cat: "Wealth Builder",
    tier: 3,
    icon: "💰",
    label: "₹10L Club",
    desc: "Net worth crossed ₹10 Lakh",
  },
  {
    id: "w25",
    cat: "Wealth Builder",
    tier: 4,
    icon: "💎",
    label: "₹25L Club",
    desc: "Net worth crossed ₹25 Lakh",
  },
  {
    id: "w50",
    cat: "Wealth Builder",
    tier: 5,
    icon: "🏅",
    label: "₹50L Club",
    desc: "Net worth crossed ₹50 Lakh",
  },
  {
    id: "w1c",
    cat: "Wealth Builder",
    tier: 6,
    icon: "🥇",
    label: "Crorepati",
    desc: "Net worth crossed ₹1 Crore",
  },
  // Smart Saver
  {
    id: "sr10",
    cat: "Smart Saver",
    tier: 1,
    icon: "🐣",
    label: "Saver",
    desc: "Savings rate above 10%",
  },
  {
    id: "sr20",
    cat: "Smart Saver",
    tier: 2,
    icon: "🐥",
    label: "Smart Saver",
    desc: "Savings rate above 20%",
  },
  {
    id: "sr30",
    cat: "Smart Saver",
    tier: 3,
    icon: "🦅",
    label: "Power Saver",
    desc: "Savings rate above 30%",
  },
  {
    id: "sr50",
    cat: "Smart Saver",
    tier: 4,
    icon: "🚀",
    label: "Super Saver",
    desc: "Saving 50%+ of monthly income",
  },
  // Safety Net
  {
    id: "ef1",
    cat: "Safety Net",
    tier: 1,
    icon: "🛡️",
    label: "Buffer Started",
    desc: "1 month of expenses in cash reserves",
  },
  {
    id: "ef3",
    cat: "Safety Net",
    tier: 2,
    icon: "🔒",
    label: "Safety Net",
    desc: "3-month emergency fund",
  },
  {
    id: "ef6",
    cat: "Safety Net",
    tier: 3,
    icon: "🏰",
    label: "Fortress",
    desc: "6-month emergency fund — fully covered",
  },
  // Investor
  {
    id: "iv1",
    cat: "Investor",
    tier: 1,
    icon: "🌱",
    label: "First Investment",
    desc: "Invested in at least one instrument",
  },
  {
    id: "iv3",
    cat: "Investor",
    tier: 2,
    icon: "🌿",
    label: "Diversified",
    desc: "Spread across 3+ asset types",
  },
  {
    id: "iv5",
    cat: "Investor",
    tier: 3,
    icon: "🌳",
    label: "Master Investor",
    desc: "Invested in 5+ different asset types",
  },
  // SIP Habit (standalone mini-chain)
  {
    id: "sip1",
    cat: "SIP Habit",
    tier: 1,
    icon: "⚙️",
    label: "SIP Started",
    desc: "Running at least 1 active SIP",
  },
  {
    id: "sip5",
    cat: "SIP Habit",
    tier: 2,
    icon: "🔄",
    label: "SIP Warrior",
    desc: "Total SIP ≥ ₹5,000/month",
  },
  // Debt Smart
  {
    id: "d40",
    cat: "Debt Smart",
    tier: 1,
    icon: "📉",
    label: "Light Borrower",
    desc: "Total EMIs below 40% of income (FOIR)",
  },
  {
    id: "d20",
    cat: "Debt Smart",
    tier: 2,
    icon: "💡",
    label: "Lean Borrower",
    desc: "Total EMIs below 20% of income",
  },
  {
    id: "df",
    cat: "Debt Smart",
    tier: 3,
    icon: "🕊️",
    label: "Debt Free",
    desc: "Zero loans and liabilities",
  },
  // Credit Smart
  {
    id: "cc0",
    cat: "Credit Smart",
    tier: 1,
    icon: "💳",
    label: "Zero Balance",
    desc: "No outstanding on any credit card",
  },
  {
    id: "cc30",
    cat: "Credit Smart",
    tier: 2,
    icon: "🎯",
    label: "Credit Ace",
    desc: "Credit utilization below 30%",
  },
  // Protected
  {
    id: "p1",
    cat: "Protected",
    tier: 1,
    icon: "🛡️",
    label: "Insured",
    desc: "Has at least one term plan or LIC",
  },
  {
    id: "p2",
    cat: "Protected",
    tier: 2,
    icon: "🏛️",
    label: "Well Protected",
    desc: "Insurance cover ≥ 10× annual income",
  },
  // Goal Setter
  {
    id: "g1",
    cat: "Goal Setter",
    tier: 1,
    icon: "🎯",
    label: "Goal Setter",
    desc: "Created your first financial goal",
  },
  {
    id: "g2",
    cat: "Goal Setter",
    tier: 2,
    icon: "🏃",
    label: "Goal Chaser",
    desc: "One goal is 50%+ funded",
  },
  {
    id: "g3",
    cat: "Goal Setter",
    tier: 3,
    icon: "🏁",
    label: "Goal Crusher",
    desc: "Fully achieved at least one goal",
  },
  // Finance Nerd
  {
    id: "fn1",
    cat: "Finance Nerd",
    tier: 1,
    icon: "📊",
    label: "Tracker",
    desc: "1+ months of transactions logged",
  },
  {
    id: "fn3",
    cat: "Finance Nerd",
    tier: 2,
    icon: "📈",
    label: "Consistent",
    desc: "3+ months of financial data",
  },
  {
    id: "fn6",
    cat: "Finance Nerd",
    tier: 3,
    icon: "🔬",
    label: "Data Driven",
    desc: "6+ months of financial history",
  },
  {
    id: "fn12",
    cat: "Finance Nerd",
    tier: 4,
    icon: "🎓",
    label: "Finance Nerd",
    desc: "12+ months of full tracking",
  },
  // Tax Saver
  {
    id: "tax1",
    cat: "Tax Saver",
    tier: 1,
    icon: "🧾",
    label: "80C Investor",
    desc: "Invested in at least one 80C instrument (PPF, ELSS, NPS, LIC, EPF)",
  },
  {
    id: "tax2",
    cat: "Tax Saver",
    tier: 2,
    icon: "🏆",
    label: "80C Maxed",
    desc: "Utilized the full ₹1.5L 80C tax deduction limit for the year",
  },
  // Passive Income
  {
    id: "pi5k",
    cat: "Passive Income",
    tier: 1,
    icon: "💸",
    label: "Passive Earner",
    desc: "Monthly passive income ≥ ₹5,000 (rent, dividends, interest)",
  },
  {
    id: "pi25k",
    cat: "Passive Income",
    tier: 2,
    icon: "🌊",
    label: "Income Builder",
    desc: "Monthly passive income ≥ ₹25,000",
  },
  {
    id: "pi1L",
    cat: "Passive Income",
    tier: 3,
    icon: "🕊️",
    label: "Freedom Income",
    desc: "Monthly passive income ≥ ₹1 Lakh — a true financial independence milestone",
  },
  // Budget Pro
  {
    id: "b1",
    cat: "Budget Pro",
    tier: 1,
    icon: "📋",
    label: "Budget Starter",
    desc: "Set up at least one spending budget category",
  },
  {
    id: "b3",
    cat: "Budget Pro",
    tier: 2,
    icon: "🎯",
    label: "Budget Pro",
    desc: "Actively managing 3+ spending categories with budgets",
  },
];

// Tip shown when a milestone category is fully earned
const CATEGORY_UNLOCK_TIP: Record<string, string> = {
  "Savings Streak": "Unlock: Check FIRE calculator to see how your streak accelerates retirement",
  "Wealth Builder": "Unlock: Use Net Worth History to track your wealth velocity over time",
  "Smart Saver": "Unlock: Your savings rate qualifies you for aggressive investment allocation",
  "Safety Net": "Unlock: With 6mo buffer you can take calculated investment risks",
  Investor: "Unlock: Explore Allocation tab to rebalance your diversified portfolio",
  "SIP Habit": "Unlock: SIP Tracker tab shows compounding projections on your SIPs",
  "Debt Smart": "Unlock: Low FOIR means you can qualify for better loan rates",
  "Credit Smart": "Unlock: Low utilization improves your credit score for future loans",
  Protected: "Unlock: Review Insurance tab to fine-tune cover vs premium tradeoff",
  "Goal Setter": "Unlock: Planning tab shows projections toward your goals",
  "Finance Nerd": "Unlock: Trends tab has 12-month expense pattern analysis enabled",
  "Tax Saver": "Unlock: Max 80C saves ₹46,800 in taxes at 30% slab — pure guaranteed return",
  "Passive Income": "Unlock: Your passive income now covers a real portion of monthly expenses",
  "Budget Pro": "Unlock: Budgeting with 3+ categories dramatically reduces lifestyle inflation",
};

// XP awarded per badge tier
const TIER_XP: Record<number, number> = { 1: 10, 2: 25, 3: 50, 4: 100, 5: 200, 6: 500 };

const XP_LEVELS = [
  { level: 1, label: "Beginner", minXP: 0 },
  { level: 2, label: "Apprentice", minXP: 100 },
  { level: 3, label: "Practitioner", minXP: 300 },
  { level: 4, label: "Strategist", minXP: 700 },
  { level: 5, label: "Expert", minXP: 1300 },
  { level: 6, label: "Wealth Master", minXP: 2100 },
];

// Personalized actionable tip for each badge that is "next up" (active)
const BADGE_TIPS: Record<string, string> = {
  s1: "Log your income & expenses this month — even one saved month earns your first streak badge.",
  s3: "You've started saving! Automate a small transfer to savings on payday to keep the streak alive.",
  s6: "6 months of saving shows discipline. Set a recurring SIP to lock in the habit mechanically.",
  s12: "Almost a year of streaks! Review your expense categories to protect the streak through high-spend months.",
  s24: "2-year streak is legendary. Stay consistent — review subscriptions and discretionary spending quarterly.",
  w1: "₹1L net worth is your first real milestone. Channel every surplus into investments, not spending.",
  w5: "Build toward ₹5L by maximizing PPF (₹1.5L/year) + any equity SIP, even ₹2,000/month compounds fast.",
  w10: "₹10L club needs equity exposure. If not invested in MF or stocks yet, start a ₹5,000/month SIP today.",
  w25: "Focus on income growth and controlling lifestyle inflation to accelerate toward ₹25L.",
  w50: "At this stage, asset allocation matters more than savings rate. Review equity vs debt mix annually.",
  w1c: "₹1 Crore is within reach. Stay diversified — don't let one asset class dominate above 60%.",
  sr10: "Saving 10% of income is the minimum. Review your top 3 expense categories for quick wins.",
  sr20: "Push from 10% to 20% by automating savings before you spend — pay yourself first.",
  sr30: "30%+ savings rate separates serious wealth builders. Audit subscriptions and dining-out spending.",
  sr50: "Saving 50% takes intentional lifestyle design. Consider barista-FIRE if the rate feels sustainable.",
  ef1: "Keep 1 month of expenses in a liquid savings account — this is your starting emergency cushion.",
  ef3: "Build 3-month buffer by parking surplus in a liquid mutual fund or high-yield savings account.",
  ef6: "A 6-month emergency fund is the gold standard. Park this in liquid funds, not FDs (for instant access).",
  iv1: "Start with one investment — even ₹500/month in an index fund counts as your first investment badge.",
  iv3: "Diversify across 3+ asset types: try adding PPF (safe) + equity MF + FD for a balanced mix.",
  iv5: "Cover 5 asset types: Equity MF, Stocks, FD, PPF, and NPS covers all categories for this badge.",
  sip1: "Start any SIP — ₹500/month in a Nifty 50 index fund is a great first step.",
  sip5: "Scale your SIP to ₹5,000/month. Use the SIP calculator to see how it compounds over 10 years.",
  d40: "Reduce total EMIs to below 40% of your income to qualify. Prepay the highest-rate loan first.",
  d20: "Cut EMI burden below 20% by closing small loans first and avoiding new debt for 6 months.",
  df: "Debt-free status: close all outstanding loans systematically, starting with the highest interest rate.",
  cc0: "Pay off your full credit card balance every month — never pay the minimum-due trap.",
  cc30: "Keep your credit utilization below 30% of your total limit to unlock this badge.",
  p1: "A term insurance plan covering 10× income costs ~₹800-1,500/month and provides critical cover.",
  p2: "Ensure total cover is at least 10× your annual income. Pure term plans are the most cost-efficient.",
  g1: "Add your first financial goal in the Goals tab — house, education, or retirement — to unlock this.",
  g2: "Allocate a dedicated SIP or savings toward each goal to reach the 50% funding milestone.",
  g3: "When a goal is within reach, park funds in liquid instruments so they're ready when you need them.",
  fn1: "Log this month's transactions to start your Finance Nerd journey and unlock the Tracker badge.",
  fn3: "3 months of consistent tracking gives you trend data — keep the habit going through all months.",
  fn6: "6 months of data reveals seasonal spending patterns. Use it to plan your next year's budget.",
  fn12: "12 months = a full FY of data. This unlocks annual tax planning, trend analysis, and FIRE projections.",
  tax1: "Invest in any 80C instrument — PPF, ELSS MF, NPS, or just ensure your EPF is active.",
  tax2: "You're close to maxing 80C! Add the remaining amount to PPF or an ELSS SIP before March 31.",
  pi5k: "Build ₹5K/month passive income with FDs, a rental room, or dividend-paying stocks.",
  pi25k: "Scale passive income with a rental property or by building a larger FD/bond ladder.",
  pi1L: "₹1L/month passive income means your investments work harder than most salaries — keep compounding.",
  b1: "Create your first budget category in the Budgeting tab to start tracking spending against limits.",
  b3: "Budget 3+ spending categories (food, transport, entertainment) to unlock the Budget Pro badge.",
};

interface AnalyticsTabProps {
  metrics: any;
  state: any;
  assetBreakdown: any[];
  trendData: any[];
  setState: any;
  marketData?: any;
  updateMasterData?: any;
  setTab?: any;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  metrics,
  state,
  assetBreakdown,
  trendData,
  setState,
  marketData,
  updateMasterData,
  setTab,
}) => {
  const [sub, setSub] = useState("dashboard");
  const [showReport, setShowReport] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ day: number; events: any[] } | null>(
    null
  );
  const [ytdMode, setYtdMode] = useState<"fy" | "cal">("fy");
  const [sipLsTarget, setSipLsTarget] = useState(0);
  const [sipLsYears, setSipLsYears] = useState(10);
  const [sipLsCagr, setSipLsCagr] = useState(12);

  // ── Database-Synced Rebalancing Target States ──
  const initialRebalTargets = useMemo(() => {
    return state.masterData?._rebalTargets || { equity: 60, debt: 25, cash: 10, other: 5 };
  }, [state.masterData?._rebalTargets]);

  const [rebalTargets, setRebalTargetsState] = useState(initialRebalTargets);

  React.useEffect(() => {
    setRebalTargetsState(initialRebalTargets);
  }, [initialRebalTargets]);

  const setRebalTargets = (updater: any) => {
    setRebalTargetsState((prev: any) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (updateMasterData) {
        updateMasterData("_rebalTargets", next);
      }
      return next;
    });
  };

  // ── Financial Runway & 10-Year Projection Engine States ──
  const initialProjection = useMemo(() => {
    return (
      state.masterData?._projectionSettings || {
        eqCAGR: 12,
        fiCAGR: 7,
        inflationRate: 6,
        windfallAmount: 0,
        windfallYear: 3,
        extraExpenseAmount: 0,
        extraExpenseYear: 5,
        fireWhatIfExtra: 0,
      }
    );
  }, [state.masterData?._projectionSettings]);

  const [eqCAGR, setEqCAGRState] = useState(initialProjection.eqCAGR);
  const [fiCAGR, setFiCAGRState] = useState(initialProjection.fiCAGR);
  const [inflationRate, setInflationRateState] = useState(initialProjection.inflationRate);
  const [windfallAmount, setWindfallAmountState] = useState(initialProjection.windfallAmount);
  const [windfallYear, setWindfallYearState] = useState(initialProjection.windfallYear);
  const [extraExpenseAmount, setExtraExpenseAmountState] = useState(
    initialProjection.extraExpenseAmount
  );
  const [extraExpenseYear, setExtraExpenseYearState] = useState(initialProjection.extraExpenseYear);
  const [fireWhatIfExtra, setFireWhatIfExtraState] = useState(initialProjection.fireWhatIfExtra);

  React.useEffect(() => {
    setEqCAGRState(initialProjection.eqCAGR);
    setFiCAGRState(initialProjection.fiCAGR);
    setInflationRateState(initialProjection.inflationRate);
    setWindfallAmountState(initialProjection.windfallAmount);
    setWindfallYearState(initialProjection.windfallYear);
    setExtraExpenseAmountState(initialProjection.extraExpenseAmount);
    setExtraExpenseYearState(initialProjection.extraExpenseYear);
    setFireWhatIfExtraState(initialProjection.fireWhatIfExtra);
  }, [initialProjection]);

  const updateProjectionField = (key: string, val: any) => {
    const nextSettings = {
      eqCAGR,
      fiCAGR,
      inflationRate,
      windfallAmount,
      windfallYear,
      extraExpenseAmount,
      extraExpenseYear,
      fireWhatIfExtra,
      [key]: val,
    };
    if (updateMasterData) {
      updateMasterData("_projectionSettings", nextSettings);
    }
  };

  const setEqCAGR = (v: number) => {
    setEqCAGRState(v);
    updateProjectionField("eqCAGR", v);
  };
  const setFiCAGR = (v: number) => {
    setFiCAGRState(v);
    updateProjectionField("fiCAGR", v);
  };
  const setInflationRate = (v: number) => {
    setInflationRateState(v);
    updateProjectionField("inflationRate", v);
  };
  const setWindfallAmount = (v: number) => {
    setWindfallAmountState(v);
    updateProjectionField("windfallAmount", v);
  };
  const setWindfallYear = (v: number) => {
    setWindfallYearState(v);
    updateProjectionField("windfallYear", v);
  };
  const setExtraExpenseAmount = (v: number) => {
    setExtraExpenseAmountState(v);
    updateProjectionField("extraExpenseAmount", v);
  };
  const setExtraExpenseYear = (v: number) => {
    setExtraExpenseYearState(v);
    updateProjectionField("extraExpenseYear", v);
  };
  const setFireWhatIfExtra = (v: number) => {
    setFireWhatIfExtraState(v);
    updateProjectionField("fireWhatIfExtra", v);
  };

  // ── Financial Health Sandbox Simulator States ──
  const [healthSimActive, setHealthSimActive] = useState(false);
  const [simSavings, setSimSavings] = useState(false);
  const [simDebt, setSimDebt] = useState(false);
  const [simEmerg, setSimEmerg] = useState(false);
  const [simDiv, setSimDiv] = useState(false);

  // ── Tax-Loss Harvesting Simulator Checklist State ──
  const [harvestedSelections, setHarvestedSelections] = useState<Record<string, boolean>>({});

  const getOrdinal = (n: number | string) => {
    const num = parseInt(n as string, 10);
    if (isNaN(num)) return n;
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const [activeAssetIndex, setActiveAssetIndex] = useState<number | null>(null);
  const [selectedAssetClass, setSelectedAssetClass] = useState<string | null>(null);

  // Market Cap states
  const [activeCapIndex, setActiveCapIndex] = useState<number | null>(null);
  const [selectedCapClass, setSelectedCapClass] = useState<string | null>(null);

  // Expense Breakup states
  const [activeExpenseIndex, setActiveExpenseIndex] = useState<number | null>(null);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string | null>(null);
  const [spendingViewMonth, setSpendingViewMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Interactive dashboard states
  const [trendPeriod, setTrendPeriod] = useState<"3M" | "6M" | "12M" | "All">("6M");
  const [showAllTxns, setShowAllTxns] = useState(false);
  const [txnFilter, setTxnFilter] = useState<"all" | "credit" | "debit">("all");

  const lastTradingDayPerformance = useMemo(() => {
    const uniqueStocks = new Map<
      string,
      { base: string; exchange: string; yfSym: string; lastPrice: number }
    >();
    (state.stocks || []).forEach((s: any) => {
      const base = s.symbol.replace(/\.(NS|BO)$/i, "");
      const exch = s.exchange || "NSE";
      const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
      if (!uniqueStocks.has(yfSym)) {
        uniqueStocks.set(yfSym, {
          base,
          exchange: exch,
          yfSym,
          lastPrice: Number(s.currentPrice || s.avgPrice || 0),
        });
      }
    });

    let gainingCount = 0;
    let losingCount = 0;
    let noChangeCount = 0;

    let topGainer: any = null;
    let topLoser: any = null;
    const noChangeStocks: any[] = [];

    uniqueStocks.forEach(({ base, yfSym, lastPrice }) => {
      const md = marketData?.[yfSym];
      if (!md) {
        noChangeCount++;
        noChangeStocks.push({
          name: base,
          symbol: yfSym,
          price: lastPrice,
          changeAmt: 0,
          changePct: 0,
        });
        return;
      }

      const changeAmt = md.change ?? 0;
      const changePct = md.changePercent ?? 0;
      const currentPrice = md.price ?? 0;

      const stockData = {
        name: base,
        symbol: yfSym,
        price: currentPrice,
        changeAmt,
        changePct,
      };

      if (changePct > 0) {
        gainingCount++;
        if (!topGainer || changePct > topGainer.changePct) {
          topGainer = stockData;
        }
      } else if (changePct < 0) {
        losingCount++;
        if (!topLoser || changePct < topLoser.changePct) {
          topLoser = stockData;
        }
      } else {
        noChangeCount++;
        noChangeStocks.push(stockData);
      }
    });

    return {
      gainingCount,
      losingCount,
      noChangeCount,
      topGainer,
      topLoser,
      noChangeStocks,
    };
  }, [state.stocks, marketData]);

  const getStockCapAssets = (capName: string) => {
    return (state.stocks || [])
      .map((s: any) => {
        const base = s.symbol.replace(/\.(NS|BO)$/i, "");
        const exch = s.exchange || "NSE";
        const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
        const md = marketData?.[yfSym];
        const mCap = Number(md?.marketCap || 0);
        const price = md?.price !== undefined ? Number(md.price) : Number(s.currentPrice || 0);
        const val = Number(s.qty || 0) * price;

        let classification = "Micro Cap";
        if (mCap >= 200000000000) classification = "Large Cap";
        else if (mCap >= 50000000000) classification = "Mid Cap";
        else if (mCap >= 5000000000) classification = "Small Cap";

        return {
          name: base,
          sub: `${s.qty} shares · CMP ₹${price.toFixed(2)}`,
          value: val,
          classification,
        };
      })
      .filter((x: any) => x.classification === capName && x.value > 0)
      .sort((a: any, b: any) => b.value - a.value);
  };

  const getExpenseAssets = (catName: string) => {
    return (state.transactions || [])
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.date &&
          t.date.startsWith(spendingViewMonth) &&
          (t.category || "Uncategorized") === catName
      )
      .map((t: any) => ({
        name: t.note || t.description || "Expense",
        sub: t.date,
        value: Number(t.amount || 0),
      }))
      .sort((a: any, b: any) => b.value - a.value);
  };

  const getSubAssets = (categoryName: string) => {
    switch (categoryName) {
      case "Bank Cash":
        return (state.bankAccounts || [])
          .map((a: any) => ({
            name: a.bankName || "Unknown Bank",
            sub: a.accountType || "Savings",
            value: Number(a.balance || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Fixed Deposits":
        return (state.fixedDeposits || [])
          .map((f: any) => ({
            name: f.bank || "FD",
            sub: `${f.rate || 0}% · Due: ${f.maturityDate || "N/A"}`,
            value: Number(f.principal || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Recurring Deposits":
        return (state.recurringDeposits || [])
          .map((r: any) => {
            const start = r.startDate ? new Date(r.startDate) : new Date();
            const now = new Date();
            const m =
              (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
            const months = Math.max(0, Math.min(m, Number(r.tenureMonths || 0)));
            const currentVal =
              months > 0 ? rdMaturity(Number(r.monthly || 0), Number(r.rate || 6), months) : 0;
            return {
              name: r.bank || "RD",
              sub: `${fmtINR(r.monthly || 0)}/mo · ${months}/${r.tenureMonths || 0} m`,
              value: currentVal,
            };
          })
          .sort((a: any, b: any) => b.value - a.value);

      case "Mutual Funds":
        return (state.mutualFunds || [])
          .map((m: any) => ({
            name: m.name || "Mutual Fund",
            sub: `${Number(m.units || 0).toFixed(3)} units @ Nav ₹${Number(m.currentNav || 0).toFixed(2)}`,
            value: Number(m.units || 0) * Number(m.currentNav || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Stocks":
        return (state.stocks || [])
          .map((s: any) => {
            const base = s.symbol.replace(/\.(NS|BO)$/i, "");
            const exch = s.exchange || "NSE";
            const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
            const md = marketData?.[yfSym];
            const price = md?.price !== undefined ? Number(md.price) : Number(s.currentPrice || 0);
            const val = Number(s.qty || 0) * price;
            return {
              name: base,
              sub: `${s.qty} shares · CMP ₹${price.toFixed(2)}`,
              value: val,
            };
          })
          .reduce((acc: any[], current: any) => {
            const existing = acc.find((item) => item.name === current.name);
            if (existing) {
              existing.value += current.value;
            } else {
              acc.push(current);
            }
            return acc;
          }, [])
          .sort((a: any, b: any) => b.value - a.value);

      case "PPF":
        return (state.ppf || [])
          .map((p: any) => ({
            name: p.bank || "PPF",
            sub: p.accountNumber ? `Ac: ${p.accountNumber}` : "PPF Balance",
            value: Number(p.balance || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "NPS":
        return (state.nps || [])
          .map((n: any) => ({
            name: n.bank || "NPS",
            sub: n.accountNumber ? `PRAN: ${n.accountNumber}` : "NPS Balance",
            value: Number(n.balance || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "EPF":
        return (state.epf || [])
          .map((e: any) => ({
            name: e.employer || "EPF",
            sub: e.uan ? `UAN: ${e.uan}` : "EPF Balance",
            value: Number(e.balance || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Bonds":
        return (state.bonds || [])
          .map((b: any) => ({
            name: b.name || "Bond",
            sub: `${b.coupon || 0}% Coupon`,
            value: Number(b.faceValue || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "LIC":
        return (state.lic || [])
          .map((l: any) => {
            const txTotal = (l.transactions || []).reduce(
              (sum: number, t: any) => sum + Number(t.amount || 0),
              0
            );
            const premium = txTotal > 0 ? txTotal : Number(l.premiumPaid || 0);
            return {
              name: l.name || "LIC Policy",
              sub: l.policyNumber ? `No: ${l.policyNumber}` : "Life Insurance",
              value: premium,
            };
          })
          .sort((a: any, b: any) => b.value - a.value);

      case "Investment Plans":
        return (state.investmentPlans || [])
          .map((ip: any) => {
            const txTotal = (ip.transactions || []).reduce(
              (sum: number, t: any) => sum + Number(t.amount || 0),
              0
            );
            const premium = txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0);
            return {
              name: ip.name || "ULIP",
              sub: ip.policyNumber ? `No: ${ip.policyNumber}` : "ULIP Investment",
              value: premium,
            };
          })
          .sort((a: any, b: any) => b.value - a.value);

      case "Loans Given":
        return (state.loansGiven || [])
          .map((l: any) => ({
            name: l.lender || "Borrower",
            sub: l.rate ? `${l.rate}% Interest` : "Interest Free",
            value: Number(l.outstanding || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      default:
        return [];
    }
  };

  const topHoldings = useMemo(() => {
    const map: Record<
      string,
      { base: string; exchange: string; yfSym: string; totalValue: number; qty: number }
    > = {};

    (state.stocks || []).forEach((s: any) => {
      const base = s.symbol.replace(/\.(NS|BO)$/i, "");
      const exch = s.exchange || "NSE";
      const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
      const md = marketData?.[yfSym];
      const price = md?.price !== undefined ? Number(md.price) : Number(s.currentPrice || 0);
      const qty = Number(s.qty || 0);

      if (!map[yfSym]) {
        map[yfSym] = { base, exchange: exch, yfSym, totalValue: 0, qty: 0 };
      }
      map[yfSym].totalValue += qty * price;
      map[yfSym].qty += qty;
    });

    const totalPortfolioValue = Object.values(map).reduce((sum, item) => sum + item.totalValue, 0);

    return Object.values(map)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((item) => ({
        ...item,
        percentage: totalPortfolioValue > 0 ? (item.totalValue / totalPortfolioValue) * 100 : 0,
      }));
  }, [state.stocks, marketData]);

  const subs = [
    { id: "dashboard", label: "Dashboard", icon: PieIcon },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "allocation", label: "Allocation", icon: Target },
    { id: "planning", label: "Planning", icon: Activity },
    { id: "spending", label: "Spending", icon: CreditCard },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "habits", label: "Habits & Rewards", icon: Flame },
  ];

  const netWorthTrend = useMemo(() => {
    const histMap: Record<string, number> = {};
    (state.netWorthHistory || []).forEach((h: any) => {
      histMap[h.month] = h.netWorth;
    });
    const now = new Date();
    return trendData.map((t, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (trendData.length - 1 - i), 1);
      // Use local date parts — toISOString() returns UTC which shifts month for IST (UTC+5:30)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const value = histMap[ym] !== undefined ? histMap[ym] : metrics.netWorth;
      return { month: t.month, value, real: histMap[ym] !== undefined };
    });
  }, [trendData, metrics, state.netWorthHistory]);

  const filteredNetWorthTrend = useMemo(() => {
    if (trendPeriod === "All") return netWorthTrend;
    const n = trendPeriod === "3M" ? 3 : trendPeriod === "6M" ? 6 : 12;
    return netWorthTrend.slice(-n);
  }, [netWorthTrend, trendPeriod]);

  const dashboardData = useMemo(() => {
    let savingsScore = 0,
      debtScore = 0,
      emergencyScore = 0,
      divScore = 0;
    if (metrics.savingsRate >= 30) savingsScore = 25;
    else if (metrics.savingsRate >= 20) savingsScore = 18;
    else if (metrics.savingsRate >= 10) savingsScore = 10;
    else if (metrics.savingsRate > 0) savingsScore = 4;
    else savingsScore = 0;

    // Bug fix: when assets=0 but liabilities>0, debtToAssetRatio defaults to 0 which
    // incorrectly passes the <10 threshold and gives a perfect score. Guard on totalAssets.
    if (metrics.totalAssets === 0) debtScore = 0;
    else if (metrics.debtToAssetRatio < 10) debtScore = 25;
    else if (metrics.debtToAssetRatio < 25) debtScore = 18;
    else if (metrics.debtToAssetRatio < 50) debtScore = 10;
    else if (metrics.totalLiabilities > 0) debtScore = 4;
    else debtScore = 0;

    const emergencyMonths =
      metrics.monthExpense > 0 ? metrics.cashInBanks / metrics.monthExpense : 0;
    if (emergencyMonths > 6) emergencyScore = 25;
    else if (emergencyMonths >= 3) emergencyScore = 18;
    else if (emergencyMonths >= 1) emergencyScore = 10;
    else if (emergencyMonths > 0) emergencyScore = 4;
    else emergencyScore = 0;

    if (state.mutualFunds.length > 0) divScore += 6;
    if (state.stocks.length > 0) divScore += 6;
    if (state.fixedDeposits.length > 0) divScore += 6;
    if (state.ppf.length > 0 || state.nps.length > 0) divScore += 7;

    const totalScore = savingsScore + debtScore + emergencyScore + divScore;
    const hasData = metrics.totalAssets > 0 || metrics.monthIncome > 0;
    const scoreColor = !hasData
      ? THEME.muted
      : totalScore >= 75
        ? THEME.sage
        : totalScore >= 50
          ? THEME.gold
          : THEME.rust;

    const investTypes = [
      state.mutualFunds.length > 0 ? "MF" : null,
      state.stocks.length > 0 ? "Stocks" : null,
      state.fixedDeposits.length > 0 ? "FDs" : null,
      state.ppf.length > 0 || state.nps.length > 0 ? "PPF/NPS" : null,
    ].filter(Boolean);

    const subScores = [
      {
        label: "Savings Rate",
        score: savingsScore,
        max: 25,
        pct: (savingsScore / 25) * 100,
        color:
          savingsScore >= 25
            ? THEME.sage
            : savingsScore >= 18
              ? THEME.gold
              : savingsScore >= 10
                ? "#F97316"
                : THEME.rust,
        hint:
          metrics.monthIncome > 0
            ? `${metrics.savingsRate.toFixed(0)}% of income saved`
            : "No income data",
      },
      {
        label: "Debt Health",
        score: debtScore,
        max: 25,
        pct: (debtScore / 25) * 100,
        color:
          debtScore >= 25
            ? THEME.sage
            : debtScore >= 18
              ? THEME.gold
              : debtScore >= 10
                ? "#F97316"
                : THEME.rust,
        hint:
          metrics.totalAssets === 0
            ? "No asset data"
            : metrics.totalLiabilities === 0
              ? "Debt-free"
              : `${metrics.debtToAssetRatio.toFixed(0)}% debt-to-asset ratio`,
      },
      {
        label: "Emergency Fund",
        score: emergencyScore,
        max: 25,
        pct: (emergencyScore / 25) * 100,
        color:
          emergencyScore >= 25
            ? THEME.sage
            : emergencyScore >= 18
              ? THEME.gold
              : emergencyScore >= 10
                ? "#F97316"
                : THEME.rust,
        hint:
          metrics.monthExpense > 0
            ? `${emergencyMonths.toFixed(1)} months of expenses covered`
            : "No expense data",
      },
      {
        label: "Diversification",
        score: divScore,
        max: 25,
        pct: (divScore / 25) * 100,
        color:
          divScore >= 25
            ? THEME.sage
            : divScore >= 18
              ? THEME.gold
              : divScore >= 10
                ? "#F97316"
                : THEME.rust,
        hint: investTypes.length > 0 ? (investTypes as string[]).join(", ") : "No investments yet",
      },
    ];

    const todayMs = new Date().getTime();
    const plus30Ms = todayMs + 30 * 86400000;
    const dues: any[] = [];
    state.creditCards
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .forEach((c: any) => {
        const dueDate = getCCDueDate(c);
        if (dueDate) {
          const [cyy, cmm, cdd] = dueDate.split("-").map(Number);
          const ms = new Date(cyy, cmm - 1, cdd).getTime();
          const daysLeft = Math.ceil((ms - todayMs) / 86400000);
          if (daysLeft >= 0 && ms <= plus30Ms)
            dues.push({
              name: (c.issuer || "Card") + " Bill",
              amount: Number(c.outstanding || 0),
              daysLeft,
              date: dueDate,
            });
        }
      });
    // Annual fees for active cards that have a fee date set
    state.creditCards
      .filter(
        (c: any) =>
          (c.status || "").toLowerCase() !== "closed" && Number(c.annualFee) > 0 && c.feeMonth
      )
      .forEach((c: any) => {
        const fMonth = Number(c.feeMonth) - 1;
        const fDay = Number(c.feeDay) || 1;
        const nowD = new Date();
        let candidate = new Date(nowD.getFullYear(), fMonth, fDay);
        if (candidate.getTime() < todayMs)
          candidate = new Date(nowD.getFullYear() + 1, fMonth, fDay);
        const ms = candidate.getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms) {
          const yyyy = candidate.getFullYear(),
            mmo = String(candidate.getMonth() + 1).padStart(2, "0"),
            ddo = String(candidate.getDate()).padStart(2, "0");
          dues.push({
            name: (c.issuer || "Card") + " Annual Fee",
            amount: Number(c.annualFee),
            daysLeft,
            date: `${yyyy}-${mmo}-${ddo}`,
          });
        }
      });
    state.subscriptions.forEach((s: any) => {
      if (s.renewalDate) {
        const [syy, smm, sdd] = s.renewalDate.split("-").map(Number);
        const ms = new Date(syy, smm - 1, sdd).getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms)
          dues.push({
            name: s.name + " Renewal",
            amount: Number(s.amount || 0),
            daysLeft,
            date: s.renewalDate,
          });
      }
    });
    // Rent dues for active rented property agreements (1-31 recurring monthly, defaults to 5th)
    (state.rentedProperties || [])
      .filter((p: any) => p.isActive !== false && Number(p.monthlyRent) > 0)
      .forEach((p: any) => {
        const dueDay = p.dueDay ? parseInt(p.dueDay, 10) : 5;
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-indexed

        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
        const paidCurrent = (p.payments || []).some(
          (pay: any) => pay.date && pay.date.startsWith(currentMonthStr)
        );
        if (!paidCurrent) {
          const curDueDate = new Date(currentYear, currentMonth, dueDay);
          const ms = curDueDate.getTime();
          const daysLeft = Math.ceil((ms - todayMs) / 86400000);
          if (ms <= plus30Ms) {
            dues.push({
              name: `${p.propertyName || "Rent"} Rent`,
              amount: Number(p.monthlyRent),
              daysLeft,
              date: curDueDate.toISOString().slice(0, 10),
              isRent: true,
            });
          }
        } else {
          const nextMonth = currentMonth + 1;
          const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
          const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;
          const nextMonthStr = `${nextYear}-${String(nextMonthNorm + 1).padStart(2, "0")}`;
          const paidNext = (p.payments || []).some(
            (pay: any) => pay.date && pay.date.startsWith(nextMonthStr)
          );
          if (!paidNext) {
            const nextDueDate = new Date(nextYear, nextMonthNorm, dueDay);
            const ms = nextDueDate.getTime();
            const daysLeft = Math.ceil((ms - todayMs) / 86400000);
            if (ms <= plus30Ms && daysLeft >= 0) {
              dues.push({
                name: `${p.propertyName || "Rent"} Rent`,
                amount: Number(p.monthlyRent),
                daysLeft,
                date: nextDueDate.toISOString().slice(0, 10),
                isRent: true,
              });
            }
          }
        }
      });
    // FD maturities within 30 days
    (state.fixedDeposits || [])
      .filter((f: any) => f.maturityDate)
      .forEach((f: any) => {
        const [fyy2, fmm2, fdd2] = f.maturityDate.split("-").map(Number);
        const ms = new Date(fyy2, fmm2 - 1, fdd2).getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms) {
          dues.push({
            name: `${f.bank || "FD"} Matures`,
            amount: Number(f.principal || 0),
            daysLeft,
            date: f.maturityDate,
            isFdMaturity: true,
          });
        }
      });
    dues.sort((a, b) => a.daysLeft - b.daysLeft);

    const saved = metrics.monthIncome - metrics.monthExpense;
    const expensePct =
      metrics.monthIncome > 0 ? (metrics.monthExpense / metrics.monthIncome) * 100 : 0;
    const savedPct = metrics.monthIncome > 0 ? Math.max(0, (saved / metrics.monthIncome) * 100) : 0;

    let streak = 0;
    const now = new Date();
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Use local date parts — toISOString() would return UTC which shifts month for IST (UTC+5:30)
      const ym2 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txns = state.transactions.filter((t: any) => t.date && t.date.startsWith(ym2));
      const inc = txns
        .filter((t: any) => t.type === "credit")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const exp = txns
        .filter((t: any) => t.type === "debit")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      if (inc > exp && inc > 0) streak++;
      else break;
    }
    const streakEmoji =
      streak >= 12 ? "🏆" : streak >= 6 ? "🔥" : streak >= 3 ? "⚡" : streak >= 1 ? "✅" : "💤";
    const streakMsg =
      streak >= 12
        ? "Incredible!"
        : streak >= 6
          ? "On fire!"
          : streak >= 3
            ? "Great run!"
            : streak >= 1
              ? "Keep going!"
              : "Start saving";

    return {
      totalScore,
      scoreColor,
      subScores,
      dues,
      saved,
      expensePct,
      savedPct,
      streak,
      streakEmoji,
      streakMsg,
      hasData,
    };
  }, [
    metrics,
    state.mutualFunds.length,
    state.stocks.length,
    state.fixedDeposits,
    state.ppf.length,
    state.nps.length,
    state.creditCards,
    state.subscriptions,
    state.transactions,
    state.rentedProperties,
  ]);

  const momNetWorthDelta = useMemo(() => {
    if (!state.netWorthHistory || state.netWorthHistory.length < 2) return null;
    const sorted = [...state.netWorthHistory].sort((a: any, b: any) =>
      a.month.localeCompare(b.month)
    );
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const latestVal = latest.netWorth ?? latest.net_worth ?? 0;
    const prevVal = prev.netWorth ?? prev.net_worth ?? 0;
    const delta = latestVal - prevVal;
    const pct = prevVal !== 0 ? (delta / Math.abs(prevVal)) * 100 : 0;
    return { delta, pct };
  }, [state.netWorthHistory]);

  const wealthVelocity = useMemo(() => {
    if (!state.netWorthHistory || state.netWorthHistory.length < 2) return null;
    const sorted = [...state.netWorthHistory]
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .slice(-7);
    if (sorted.length < 2) return null;
    const changes: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i].netWorth ?? sorted[i].net_worth ?? 0;
      const prev = sorted[i - 1].netWorth ?? sorted[i - 1].net_worth ?? 0;
      changes.push(curr - prev);
    }
    const avg = changes.reduce((s, v) => s + v, 0) / changes.length;
    const latest = changes[changes.length - 1] ?? 0;
    const accel = changes.length >= 2 ? latest - changes[changes.length - 2] : 0;
    return { avg, latest, accel, months: changes.length };
  }, [state.netWorthHistory]);

  // Spending breakdown for the user-selected month (supports navigation)
  const spendingData = useMemo(() => {
    const catMap: Record<string, number> = {};
    (state.transactions || [])
      .filter((t: any) => t.type === "debit" && t.date && t.date.startsWith(spendingViewMonth))
      .forEach((t: any) => {
        const cat = t.category || "Uncategorized";
        catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
      });
    const rentFromProps = (state.rentedProperties || []).reduce((sum: number, p: any) => {
      return (
        sum +
        (p.payments || [])
          .filter((pay: any) => pay.date && pay.date.startsWith(spendingViewMonth))
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0)
      );
    }, 0);
    if (rentFromProps > 0 && !catMap["Rent"]) catMap["Rent"] = rentFromProps;
    const breakdown = Object.keys(catMap)
      .map((k) => ({ name: k, value: catMap[k] }))
      .sort((a, b) => b.value - a.value);
    const total = breakdown.reduce((s, x) => s + x.value, 0);
    return { breakdown, total };
  }, [spendingViewMonth, state.transactions, state.rentedProperties]);

  // Previous-month expenses relative to spendingViewMonth (for MoM comparison)
  const spendingPrevData = useMemo(() => {
    const [y, m] = spendingViewMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const catMap: Record<string, number> = {};
    (state.transactions || [])
      .filter((t: any) => t.type === "debit" && t.date && t.date.startsWith(prevYm))
      .forEach((t: any) => {
        const cat = t.category || "Uncategorized";
        catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
      });
    const rentFromProps = (state.rentedProperties || []).reduce((sum: number, p: any) => {
      return (
        sum +
        (p.payments || [])
          .filter((pay: any) => pay.date && pay.date.startsWith(prevYm))
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0)
      );
    }, 0);
    if (rentFromProps > 0 && !catMap["Rent"]) catMap["Rent"] = rentFromProps;
    return catMap;
  }, [spendingViewMonth, state.transactions, state.rentedProperties]);

  const fireData = useMemo(() => {
    const annualExpense = metrics.monthExpense * 12;
    const fireCorpus = annualExpense * 25;
    const progress =
      fireCorpus > 0 ? Math.min((Math.max(metrics.netWorth, 0) / fireCorpus) * 100, 100) : 0;
    return { fireCorpus, progress, annualExpense };
  }, [metrics.monthExpense, metrics.netWorth]);

  const passiveIncomeData = useMemo(() => {
    const rentalMonthly = (state.rentalProperties || [])
      .filter((r: any) => Number(r.rent || 0) > 0)
      .reduce((s: number, r: any) => s + Number(r.rent || 0), 0);

    const fdMonthly = (state.fixedDeposits || []).reduce(
      (s: number, f: any) => s + (Number(f.principal || 0) * Number(f.rate || 0)) / 100 / 12,
      0
    );

    const rdMonthly = (state.recurringDeposits || []).reduce((sum: number, r: any) => {
      const start = r.startDate ? new Date(r.startDate) : new Date();
      const now = new Date();
      const m =
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const months = Math.max(0, Math.min(m, Number(r.tenureMonths || 0)));
      const currentVal =
        months > 0 ? rdMaturity(Number(r.monthly || 0), Number(r.rate || 6), months) : 0;
      return sum + (currentVal * Number(r.rate || 6)) / 100 / 12;
    }, 0);

    const savingsMonthly = (metrics.cashInBanks * 0.03) / 12;
    const stockDividendsMonthly = (metrics.stockValue * 0.012) / 12;
    const mfYieldMonthly = (metrics.mfValue * 0.01) / 12;

    const totalPassive =
      rentalMonthly +
      fdMonthly +
      rdMonthly +
      savingsMonthly +
      stockDividendsMonthly +
      mfYieldMonthly;
    const passiveRatio = metrics.monthIncome > 0 ? (totalPassive / metrics.monthIncome) * 100 : 0;

    return {
      rentalMonthly,
      fdMonthly,
      rdMonthly,
      savingsMonthly,
      stockDividendsMonthly,
      mfYieldMonthly,
      totalPassive,
      passiveRatio,
    };
  }, [
    state.rentalProperties,
    state.fixedDeposits,
    state.recurringDeposits,
    metrics.cashInBanks,
    metrics.stockValue,
    metrics.mfValue,
    metrics.monthIncome,
  ]);

  const taxData80C = useMemo(() => {
    const limit = 150000;
    const fyParts = (state.profile?.fy || "").split("-");
    const fyStartYear = Number(fyParts[0]) || new Date().getFullYear() - 1;
    const fyStartStr = `${fyStartYear}-04-01`;
    const fyEndStr = `${fyStartYear + 1}-03-31`;
    const elss = (state.mutualFunds || [])
      .filter((m: any) => (m.type || m.category || "").toUpperCase().includes("ELSS"))
      .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);
    const ppfThisYear = (state.ppfLedger || [])
      .filter(
        (t: any) => t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const ppfAnnual =
      ppfThisYear > 0
        ? ppfThisYear
        : (state.ppf || []).reduce(
            (s: number, p: any) => s + Number(p.yearlyContribution || p.annualContribution || 0),
            0
          );
    const licPremium = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.annualPremium || 0),
      0
    );
    const epfEmployee = (state.epf || []).reduce((s: number, e: any) => {
      const ledgerTotal = (e.transactions || [])
        .filter(
          (t: any) => t.type === "employee" && t.date && t.date >= fyStartStr && t.date <= fyEndStr
        )
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return s + (ledgerTotal > 0 ? ledgerTotal : Number(e.yearlyContribution || 0));
    }, 0);
    const total = Math.min(elss + ppfAnnual + licPremium + epfEmployee, limit);
    const remaining = Math.max(0, limit - total);
    return {
      elss,
      ppfAnnual,
      licPremium,
      epfEmployee,
      total,
      remaining,
      limit,
      progress: total > 0 ? (total / limit) * 100 : 0,
    };
  }, [state.mutualFunds, state.ppf, state.ppfLedger, state.lic, state.epf, state.profile?.fy]);

  // ── Habits & Rewards: badge evaluation ───────────────────────────────────
  const habitsBadges = useMemo(() => {
    const earned = new Set<string>();
    const prog: Record<string, { current: number; target: number; label: string }> = {};

    // Savings Streak
    const streak = dashboardData.streak;
    if (streak >= 1) earned.add("s1");
    if (streak >= 3) earned.add("s3");
    if (streak >= 6) earned.add("s6");
    if (streak >= 12) earned.add("s12");
    if (streak >= 24) earned.add("s24");
    const nextS = [
      ["s1", 1],
      ["s3", 3],
      ["s6", 6],
      ["s12", 12],
      ["s24", 24],
    ].find(([id]) => !earned.has(id)) as [string, number] | undefined;
    if (nextS)
      prog[nextS[0]] = {
        current: streak,
        target: nextS[1],
        label: `${streak} of ${nextS[1]} months`,
      };

    // Wealth Builder
    const nw = metrics.netWorth;
    const nwMiles = [
      ["w1", 100000],
      ["w5", 500000],
      ["w10", 1000000],
      ["w25", 2500000],
      ["w50", 5000000],
      ["w1c", 10000000],
    ] as [string, number][];
    nwMiles.forEach(([id, thr]) => {
      if (nw >= thr) earned.add(id);
    });
    const nextNW = nwMiles.find(([id]) => !earned.has(id));
    if (nextNW) {
      const idx = nwMiles.findIndex(([id]) => id === nextNW[0]);
      const prevThr = idx > 0 ? nwMiles[idx - 1][1] : 0;
      prog[nextNW[0]] = {
        current: Math.max(0, nw - prevThr),
        target: nextNW[1] - prevThr,
        label: `${fmtINR(Math.max(0, nw))} of ${fmtINR(nextNW[1])}`,
      };
    }

    // Smart Saver
    const sr = metrics.savingsRate;
    const srMiles = [
      ["sr10", 10],
      ["sr20", 20],
      ["sr30", 30],
      ["sr50", 50],
    ] as [string, number][];
    srMiles.forEach(([id, thr]) => {
      if (sr >= thr) earned.add(id);
    });
    const nextSR = srMiles.find(([id]) => !earned.has(id));
    if (nextSR)
      prog[nextSR[0]] = {
        current: Math.max(0, sr),
        target: nextSR[1],
        label: `${Math.max(0, sr).toFixed(0)}% of ${nextSR[1]}%`,
      };

    // Safety Net
    const efM = metrics.monthExpense > 0 ? metrics.cashInBanks / metrics.monthExpense : 0;
    const efMiles = [
      ["ef1", 1],
      ["ef3", 3],
      ["ef6", 6],
    ] as [string, number][];
    efMiles.forEach(([id, thr]) => {
      if (efM >= thr) earned.add(id);
    });
    const nextEF = efMiles.find(([id]) => !earned.has(id));
    if (nextEF)
      prog[nextEF[0]] = {
        current: efM,
        target: nextEF[1],
        label: `${efM.toFixed(1)} of ${nextEF[1]} months`,
      };

    // Investor — asset type count
    const assetTypes = [
      (state.mutualFunds?.length || 0) > 0,
      (state.stocks?.length || 0) > 0,
      (state.fixedDeposits?.length || 0) > 0,
      (state.ppf?.length || 0) > 0,
      (state.nps?.length || 0) > 0,
      (state.epf?.length || 0) > 0,
      (state.bonds?.length || 0) > 0,
    ].filter(Boolean).length;
    if (assetTypes >= 1) earned.add("iv1");
    if (assetTypes >= 3) earned.add("iv3");
    if (assetTypes >= 5) earned.add("iv5");
    if (!earned.has("iv3"))
      prog["iv3"] = { current: assetTypes, target: 3, label: `${assetTypes} of 3 asset types` };
    else if (!earned.has("iv5"))
      prog["iv5"] = { current: assetTypes, target: 5, label: `${assetTypes} of 5 asset types` };

    // SIP Habit
    const totalSIPAmt = (state.sips || []).reduce(
      (s: number, sip: any) => s + Number(sip.amount || 0),
      0
    );
    if ((state.sips?.length || 0) > 0) earned.add("sip1");
    if (totalSIPAmt >= 5000) earned.add("sip5");
    if (!earned.has("sip1"))
      prog["sip1"] = { current: 0, target: 1, label: "Start 1 SIP to unlock" };
    else if (!earned.has("sip5"))
      prog["sip5"] = {
        current: totalSIPAmt,
        target: 5000,
        label: `${fmtINR(totalSIPAmt)} of ${fmtINR(5000)}/mo`,
      };

    // Debt Smart
    const activeLoans = (state.loansTaken || []).filter(
      (l: any) => Number(l.outstanding || 0) > 0 && Number(l.emi || 0) > 0
    );
    const totalEMI = activeLoans.reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    const foirPct = metrics.monthIncome > 0 ? (totalEMI / metrics.monthIncome) * 100 : 0;
    if (metrics.monthIncome > 0 && foirPct < 40) earned.add("d40");
    if (metrics.monthIncome > 0 && foirPct < 20) earned.add("d20");
    if (metrics.totalLiabilities === 0 && metrics.netWorth >= 0) earned.add("df");

    // Credit Smart
    const activeCC = (state.creditCards || []).filter(
      (c: any) => (c.status || "").toLowerCase() !== "closed"
    );
    const ccOut = activeCC.reduce((s: number, c: any) => s + Number(c.outstanding || 0), 0);
    const ccLim = activeCC.reduce((s: number, c: any) => s + Number(c.limit || 0), 0);
    const ccUtil = ccLim > 0 ? (ccOut / ccLim) * 100 : 0;
    if (activeCC.length > 0 && ccOut === 0) earned.add("cc0");
    if (ccLim > 0 && ccUtil < 30) earned.add("cc30");

    // Protected
    const hasIns = (state.termPlans?.length || 0) + (state.lic?.length || 0) > 0;
    if (hasIns) earned.add("p1");
    const totalCover = (state.termPlans || []).reduce(
      (s: number, t: any) => s + Number(t.coverAmount || 0),
      0
    );
    if (metrics.monthIncome > 0 && totalCover >= metrics.monthIncome * 12 * 10) earned.add("p2");

    // Goal Setter
    if ((state.goals?.length || 0) > 0) earned.add("g1");
    if (
      (state.goals || []).some(
        (g: any) =>
          Number(g.targetAmount || 0) > 0 &&
          Number(g.currentAmount || 0) / Number(g.targetAmount || 0) >= 0.5
      )
    )
      earned.add("g2");
    if (
      (state.goals || []).some(
        (g: any) =>
          Number(g.targetAmount || 0) > 0 &&
          Number(g.currentAmount || 0) >= Number(g.targetAmount || 0)
      )
    )
      earned.add("g3");

    // Finance Nerd
    const trackedMonths = new Set(
      (state.transactions || []).map((t: any) => (t.date || "").slice(0, 7))
    ).size;
    const fnMiles = [
      ["fn1", 1],
      ["fn3", 3],
      ["fn6", 6],
      ["fn12", 12],
    ] as [string, number][];
    fnMiles.forEach(([id, thr]) => {
      if (trackedMonths >= thr) earned.add(id);
    });
    const nextFN = fnMiles.find(([id]) => !earned.has(id));
    if (nextFN)
      prog[nextFN[0]] = {
        current: trackedMonths,
        target: nextFN[1],
        label: `${trackedMonths} of ${nextFN[1]} months logged`,
      };

    // Tax Saver
    const has80CAsset =
      (state.ppf?.length || 0) +
        (state.nps?.length || 0) +
        (state.epf?.length || 0) +
        (state.lic?.length || 0) >
        0 ||
      (state.mutualFunds || []).some((m: any) =>
        (m.type || m.category || "").toUpperCase().includes("ELSS")
      );
    if (has80CAsset) earned.add("tax1");
    // Compute 80C total for current FY using same logic as taxData80C
    const fyParts80C = (state.profile?.fy || "").split("-");
    const fyStart80C = Number(fyParts80C[0]) || new Date().getFullYear() - 1;
    const fyStartStr80C = `${fyStart80C}-04-01`;
    const fyEndStr80C = `${fyStart80C + 1}-03-31`;
    const elss80C = (state.mutualFunds || [])
      .filter((m: any) => (m.type || m.category || "").toUpperCase().includes("ELSS"))
      .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);
    const ppf80C =
      (state.ppfLedger || [])
        .filter(
          (t: any) =>
            t.date && t.date >= fyStartStr80C && t.date <= fyEndStr80C && t.type !== "withdrawal"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0) ||
      (state.ppf || []).reduce(
        (s: number, p: any) => s + Number(p.yearlyContribution || p.annualContribution || 0),
        0
      );
    const lic80C = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.annualPremium || 0),
      0
    );
    const epf80C = (state.epf || []).reduce((s: number, e: any) => {
      const lTotal = (e.transactions || [])
        .filter(
          (t: any) =>
            t.type === "employee" && t.date && t.date >= fyStartStr80C && t.date <= fyEndStr80C
        )
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return s + (lTotal > 0 ? lTotal : Number(e.yearlyContribution || 0));
    }, 0);
    const total80C = Math.min(elss80C + ppf80C + lic80C + epf80C, 150000);
    if (total80C >= 150000) earned.add("tax2");
    if (!earned.has("tax1"))
      prog["tax1"] = { current: 0, target: 1, label: "Add a PPF/ELSS/NPS/LIC investment" };
    else if (!earned.has("tax2"))
      prog["tax2"] = {
        current: total80C,
        target: 150000,
        label: `${fmtINR(total80C)} of ${fmtINR(150000)} invested`,
      };

    // Passive Income (rent + estimated FD/bond interest)
    const rentalPassive = (state.rentalProperties || [])
      .filter((r: any) => Number(r.rent || 0) > 0)
      .reduce((s: number, r: any) => s + Number(r.rent || 0), 0);
    const fdPassive = (state.fixedDeposits || []).reduce(
      (s: number, f: any) => s + (Number(f.principal || 0) * Number(f.rate || 0)) / 100 / 12,
      0
    );
    const bondPassive = ((metrics.bondValue || 0) * 0.07) / 12;
    const savPassive = (metrics.cashInBanks * 0.03) / 12;
    const divPassive =
      ((metrics.stockValue || 0) * 0.012) / 12 + ((metrics.mfValue || 0) * 0.01) / 12;
    const totalPassiveMonthly = rentalPassive + fdPassive + bondPassive + savPassive + divPassive;
    const piMiles = [
      ["pi5k", 5000],
      ["pi25k", 25000],
      ["pi1L", 100000],
    ] as [string, number][];
    piMiles.forEach(([id, thr]) => {
      if (totalPassiveMonthly >= thr) earned.add(id);
    });
    const nextPI = piMiles.find(([id]) => !earned.has(id));
    if (nextPI) {
      const piIdx = piMiles.findIndex(([id]) => id === nextPI[0]);
      const prevThr = piIdx > 0 ? piMiles[piIdx - 1][1] : 0;
      prog[nextPI[0]] = {
        current: Math.max(0, totalPassiveMonthly - prevThr),
        target: nextPI[1] - prevThr,
        label: `${fmtINR(Math.round(totalPassiveMonthly))}/mo of ${fmtINR(nextPI[1])}/mo`,
      };
    }

    // Budget Pro
    const budgetCount = (state.budgets || []).length;
    if (budgetCount >= 1) earned.add("b1");
    if (budgetCount >= 3) earned.add("b3");
    if (!earned.has("b1"))
      prog["b1"] = { current: 0, target: 1, label: "Create your first budget category" };
    else if (!earned.has("b3"))
      prog["b3"] = {
        current: budgetCount,
        target: 3,
        label: `${budgetCount} of 3 budget categories`,
      };

    // Build category map for rendering
    const cats: Record<string, { badges: any[]; earnedCount: number; total: number }> = {};
    for (const b of BADGE_CATALOG) {
      if (!cats[b.cat]) cats[b.cat] = { badges: [], earnedCount: 0, total: 0 };
      const isEarned = earned.has(b.id);
      const catBadges = BADGE_CATALOG.filter((x) => x.cat === b.cat);
      const prevBadge = catBadges.find((x) => x.tier === b.tier - 1);
      const prevEarned = !prevBadge || earned.has(prevBadge.id);
      const status: "earned" | "active" | "locked" = isEarned
        ? "earned"
        : prevEarned
          ? "active"
          : "locked";
      cats[b.cat].badges.push({ ...b, status, progress: prog[b.id] });
      cats[b.cat].total++;
      if (isEarned) cats[b.cat].earnedCount++;
    }

    // XP computation
    let totalXP = 0;
    for (const b of BADGE_CATALOG) {
      if (earned.has(b.id)) totalXP += TIER_XP[b.tier] || 10;
    }
    const curLevelIdx = XP_LEVELS.slice()
      .reverse()
      .findIndex((l) => totalXP >= l.minXP);
    const curLevel = XP_LEVELS[XP_LEVELS.length - 1 - curLevelIdx];
    const nextLevel = XP_LEVELS[Math.min(XP_LEVELS.indexOf(curLevel) + 1, XP_LEVELS.length - 1)];
    const levelPct =
      nextLevel.minXP > curLevel.minXP
        ? Math.min(
            100,
            Math.round(((totalXP - curLevel.minXP) / (nextLevel.minXP - curLevel.minXP)) * 100)
          )
        : 100;
    const xpToNext = nextLevel.minXP > curLevel.minXP ? Math.max(0, nextLevel.minXP - totalXP) : 0;

    // Smart action tips: top 3 active badges with tips
    const tips = BADGE_CATALOG.filter(
      (b) =>
        cats[b.cat]?.badges.find((x: any) => x.id === b.id)?.status === "active" && BADGE_TIPS[b.id]
    )
      .slice(0, 3)
      .map((b) => {
        const badgeState = cats[b.cat].badges.find((x: any) => x.id === b.id);
        const pct = badgeState?.progress
          ? Math.min(
              100,
              Math.round((badgeState.progress.current / badgeState.progress.target) * 100)
            )
          : 0;
        return {
          icon: b.icon,
          badge: b.label,
          tip: BADGE_TIPS[b.id],
          progress: badgeState?.progress,
          pct,
        };
      });

    // FOIR for peer benchmarking
    const activeLoansHB = (state.loansTaken || []).filter(
      (l: any) => Number(l.outstanding || 0) > 0 && Number(l.emi || 0) > 0
    );
    const totalEMIHB = activeLoansHB.reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    const foirPctHB =
      metrics.monthIncome > 0 ? Math.round((totalEMIHB / metrics.monthIncome) * 100) : 0;
    const investRateHB =
      metrics.monthIncome > 0
        ? Math.min(
            100,
            Math.round(
              ((metrics.totalAssets - metrics.cashInBanks) / (metrics.monthIncome * 12)) * 100
            )
          )
        : 0;
    const efMonthsHB =
      metrics.monthExpense > 0 ? Math.min(12, metrics.cashInBanks / metrics.monthExpense) : 0;

    return {
      earned,
      cats,
      totalEarned: earned.size,
      totalBadges: BADGE_CATALOG.length,
      totalXP,
      level: curLevel.level,
      levelLabel: curLevel.label,
      nextLevelLabel: nextLevel.label,
      levelPct,
      xpToNext,
      tips,
      foirPctHB,
      investRateHB,
      efMonthsHB,
      totalPassiveMonthly,
    };
  }, [metrics, dashboardData.streak, state]);

  // ── Streak calendar: January to December of current year ──
  const streakCalendar = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(currentYear, i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txns = (state.transactions || []).filter((t: any) => t.date && t.date.startsWith(ym));
      const inc = txns
        .filter((t: any) => t.type === "credit")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const exp = txns
        .filter((t: any) => t.type === "debit")
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const hasData = txns.length > 0;
      return {
        label: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear(),
        saved: hasData && inc > exp && inc > 0,
        hasData,
        rate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
      };
    });
  }, [state.transactions]);

  // ── XP breakdown by badge category ──
  const xpByCategory = useMemo(() => {
    const bycat: Record<string, { earned: number; possible: number }> = {};
    for (const b of BADGE_CATALOG) {
      if (!bycat[b.cat]) bycat[b.cat] = { earned: 0, possible: 0 };
      bycat[b.cat].possible += TIER_XP[b.tier] || 10;
      if (habitsBadges.earned.has(b.id)) bycat[b.cat].earned += TIER_XP[b.tier] || 10;
    }
    return Object.entries(bycat)
      .map(([cat, d]) => ({
        cat,
        ...d,
        pct: d.possible > 0 ? Math.round((d.earned / d.possible) * 100) : 0,
      }))
      .sort((a, b) => b.earned - a.earned);
  }, [habitsBadges.earned]);

  // ── Financial Runway & 10-Year Projection Engine Calculations ──
  const projectionData = useMemo(() => {
    const data = [];
    const now = new Date();
    const startYear = now.getFullYear();

    const baseEquity = Number(metrics.mfValue || 0) + Number(metrics.stockValue || 0);
    const baseFI =
      Number(metrics.fdValue || 0) +
      Number(metrics.rdValue || 0) +
      Number(metrics.bondValue || 0) +
      Number(metrics.ppfValue || 0) +
      Number(metrics.npsValue || 0) +
      Number(metrics.epfValue || 0) +
      Number(metrics.licValue || 0) +
      Number(metrics.investmentValue || 0);
    const baseCash = Number(metrics.cashInBanks || 0);
    const liabilities = Number(metrics.totalLiabilities || 0);

    // Active monthly investments (SIPs + extra input)
    const monthlySIP =
      (state.sips || []).reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0) +
      fireWhatIfExtra;
    const annualSavings = monthlySIP * 12;
    const annualExpense = Number(metrics.monthExpense || 0) * 12;

    let currentEq = baseEquity;
    let currentFI = baseFI;
    let currentCash = baseCash;

    // Push Year 0 (Current State)
    data.push({
      year: startYear,
      yearIndex: 0,
      netWorth: Math.max(0, currentEq + currentFI + currentCash - liabilities),
      realNetWorth: Math.max(0, currentEq + currentFI + currentCash - liabilities),
      fireTarget: annualExpense * 25,
      equities: currentEq,
      fixedIncome: currentFI,
      cash: currentCash,
    });

    for (let y = 1; y <= 10; y++) {
      // 1. Compound existing assets
      currentEq = currentEq * (1 + eqCAGR / 100);
      currentFI = currentFI * (1 + fiCAGR / 100);
      currentCash = currentCash * 1.03; // Cash grows at a conservative 3%

      // 2. Add annual savings/SIP contribution (70% Equity / 30% Fixed Income split)
      currentEq += annualSavings * 0.7;
      currentFI += annualSavings * 0.3;

      // 3. Life event overrides (Windfalls/Expenses)
      if (y === Number(windfallYear) && windfallAmount > 0) {
        currentCash += Number(windfallAmount);
      }
      if (y === Number(extraExpenseYear) && extraExpenseAmount > 0) {
        currentCash = Math.max(0, currentCash - Number(extraExpenseAmount));
      }

      const nominalNetWorth = currentEq + currentFI + currentCash - liabilities;
      const inflFactor = Math.pow(1 + inflationRate / 100, y);
      const realNetWorth = nominalNetWorth / inflFactor;
      const fireTarget = annualExpense * 25 * inflFactor;

      data.push({
        year: startYear + y,
        yearIndex: y,
        netWorth: Math.max(0, nominalNetWorth),
        realNetWorth: Math.max(0, realNetWorth),
        fireTarget: Math.max(0, fireTarget),
        equities: currentEq,
        fixedIncome: currentFI,
        cash: currentCash,
      });
    }

    return data;
  }, [
    metrics,
    state.sips,
    fireWhatIfExtra,
    eqCAGR,
    fiCAGR,
    inflationRate,
    windfallAmount,
    windfallYear,
    extraExpenseAmount,
    extraExpenseYear,
  ]);

  const crossoverYear = useMemo(() => {
    const match = projectionData.find((d) => d.netWorth >= d.fireTarget);
    return match ? match.year : null;
  }, [projectionData]);

  const smartInsights = useMemo(() => {
    const insights: any[] = [];
    const now2 = new Date();
    const fyStartYear2 = now2.getMonth() >= 3 ? now2.getFullYear() : now2.getFullYear() - 1;
    const fyStart2 = new Date(`${fyStartYear2}-04-01`);
    const explicitIncome = (state.income || [])
      .filter((i: any) => new Date(i.date) >= fyStart2)
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const txnIncome = (state.transactions || [])
      .filter((t: any) => t.type === "credit" && t.date && new Date(t.date) >= fyStart2)
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const annualizedCurrentMonth = (metrics?.monthIncome || 0) * 12;
    // Correct priority: explicit ledger → FY-to-date txns → annualised current month
    const annualIncome = explicitIncome || txnIncome || annualizedCurrentMonth || 0;

    const totalTermCover = (state.termPlans || []).reduce(
      (s: number, t: any) => s + Number(t.coverAmount || 0),
      0
    );
    const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
    const emergencyMonths =
      metrics.monthExpense > 0 ? metrics.cashInBanks / metrics.monthExpense : 0;

    if (metrics.monthIncome > 0 && metrics.savingsRate < 10)
      insights.push({
        icon: AlertTriangle,
        title: "Low Savings Rate",
        value: `${metrics.savingsRate.toFixed(0)}% · target 20%+`,
        color: THEME.rust,
        bg: `${THEME.rust}12`,
      });
    else if (metrics.savingsRate >= 30)
      insights.push({
        icon: Flame,
        title: "Strong Savings Rate",
        value: `${metrics.savingsRate.toFixed(0)}% this month`,
        color: THEME.sage,
        bg: `${THEME.sage}12`,
      });

    if (metrics.monthExpense > 0 && emergencyMonths < 3)
      insights.push({
        icon: ShieldAlert,
        title: "Emergency Fund",
        value: `${emergencyMonths.toFixed(1)} mo liquid · need 3+`,
        color: THEME.rust,
        bg: `${THEME.rust}12`,
      });
    else if (emergencyMonths >= 6)
      insights.push({
        icon: ShieldAlert,
        title: "Emergency Fund",
        value: `${emergencyMonths.toFixed(1)} mo — solid cover`,
        color: THEME.sage,
        bg: `${THEME.sage}12`,
      });

    if (annualIncome > 0 && coverRatio < 10)
      insights.push({
        icon: AlertTriangle,
        title: "Insurance Gap",
        value: `${fmtINR(annualIncome * 15 - totalTermCover)} short of 15× cover`,
        color: THEME.gold,
        bg: `${THEME.gold}12`,
      });

    if (metrics.debtToAssetRatio > 40)
      insights.push({
        icon: AlertTriangle,
        title: "High Debt Ratio",
        value: `${metrics.debtToAssetRatio.toFixed(0)}% of total assets`,
        color: THEME.rust,
        bg: `${THEME.rust}12`,
      });

    const urgentDues = dashboardData.dues.filter((d: any) => d.daysLeft <= 7);
    if (urgentDues.length > 0)
      insights.push({
        icon: AlertTriangle,
        title: `${urgentDues.length} Due This Week`,
        value: urgentDues
          .slice(0, 2)
          .map((d: any) => d.name)
          .join(", "),
        color: THEME.gold,
        bg: `${THEME.gold}12`,
      });

    if ((state.sips || []).length === 0 && metrics.monthIncome > 0)
      insights.push({
        icon: Zap,
        title: "No Active SIPs",
        value: "Consider starting a monthly mutual fund SIP",
        color: THEME.accent,
        bg: `${THEME.accent}12`,
      });

    // FOIR: Fixed Obligation to Income Ratio — healthy lending threshold is <40%
    const totalEMISmart = (state.loansTaken || []).reduce(
      (s: number, l: any) => s + Number(l.emi || 0),
      0
    );
    if (metrics.monthIncome > 0 && totalEMISmart > 0) {
      const foirPct = (totalEMISmart / metrics.monthIncome) * 100;
      if (foirPct > 50)
        insights.push({
          icon: AlertTriangle,
          title: "EMI Burden Critical",
          value: `${foirPct.toFixed(0)}% FOIR — reduce debt urgently`,
          color: THEME.rust,
          bg: `${THEME.rust}12`,
        });
      else if (foirPct > 40)
        insights.push({
          icon: AlertTriangle,
          title: "High EMI Burden",
          value: `${foirPct.toFixed(0)}% FOIR · keep under 40%`,
          color: THEME.gold,
          bg: `${THEME.gold}12`,
        });
    }

    // Credit card utilization — above 30% can hurt credit score
    const totalCCLimitSmart = (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s: number, c: any) => s + Number(c.limit || c.cardLimit || 0), 0);
    if (totalCCLimitSmart > 0 && metrics.ccOutstanding > 0) {
      const utilPct = (metrics.ccOutstanding / totalCCLimitSmart) * 100;
      if (utilPct > 50)
        insights.push({
          icon: AlertTriangle,
          title: "High Credit Utilization",
          value: `${utilPct.toFixed(0)}% used · aim for below 30%`,
          color: THEME.rust,
          bg: `${THEME.rust}12`,
        });
    }

    // Loan payoff timeline — nearest-to-payoff loan (highest EMI-to-outstanding ratio)
    const activeLoans = (state.loansTaken || []).filter(
      (l: any) => Number(l.outstanding || 0) > 0 && Number(l.emi || 0) > 0
    );
    if (activeLoans.length > 0) {
      const withMonths = activeLoans
        .map((l: any) => {
          const outstanding = Number(l.outstanding || 0);
          const emi = Number(l.emi || 0);
          const rate = Number(l.interestRate || 0) / 12 / 100;
          let months: number;
          if (rate === 0) {
            months = Math.ceil(outstanding / emi);
          } else {
            // n = -ln(1 - r*P/EMI) / ln(1+r)
            const ratio = (rate * outstanding) / emi;
            months = ratio >= 1 ? 9999 : Math.ceil(-Math.log(1 - ratio) / Math.log(1 + rate));
          }
          return { name: l.loanName || l.bank || "Loan", months, outstanding };
        })
        .filter((l: any) => l.months < 9999);

      if (withMonths.length > 0) {
        withMonths.sort((a: any, b: any) => a.months - b.months);
        const soonest = withMonths[0];
        const yrs = Math.floor(soonest.months / 12);
        const mo = soonest.months % 12;
        const timeStr = yrs > 0 ? `${yrs}y ${mo}m` : `${mo} mo`;
        insights.push({
          icon: CheckCircle2,
          title: `${soonest.name} payoff in ${timeStr}`,
          value: `${fmtINR(soonest.outstanding)} remaining · ${withMonths.length} active loan${withMonths.length > 1 ? "s" : ""}`,
          color: THEME.accent,
          bg: `${THEME.accent}12`,
        });
      }
    }

    // Expense anomaly: flag any category where this month is 50%+ above its 3-month average
    if (metrics.monthExpense > 0) {
      const now3 = new Date();
      const currentYm = `${now3.getFullYear()}-${String(now3.getMonth() + 1).padStart(2, "0")}`;
      // Build category totals for previous 3 months
      const prev3Map: Record<string, number[]> = {};
      for (let m = 1; m <= 3; m++) {
        const d3 = new Date(now3.getFullYear(), now3.getMonth() - m, 1);
        const ym3 = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, "0")}`;
        (state.transactions || [])
          .filter((t: any) => t.type === "debit" && t.date && t.date.startsWith(ym3))
          .forEach((t: any) => {
            const cat = t.category || "Uncategorized";
            if (!prev3Map[cat]) prev3Map[cat] = [];
            prev3Map[cat].push(Number(t.amount || 0));
          });
      }
      const currentCatMap: Record<string, number> = {};
      (state.transactions || [])
        .filter((t: any) => t.type === "debit" && t.date && t.date.startsWith(currentYm))
        .forEach((t: any) => {
          const cat = t.category || "Uncategorized";
          currentCatMap[cat] = (currentCatMap[cat] || 0) + Number(t.amount || 0);
        });
      const anomalies = Object.entries(currentCatMap)
        .filter(([cat, thisMonthVal]) => {
          const prev = prev3Map[cat];
          if (!prev || prev.length < 2) return false;
          const avg3 = prev.reduce((s, v) => s + v, 0) / prev.length;
          return avg3 > 0 && thisMonthVal > avg3 * 1.5 && thisMonthVal > 500;
        })
        .sort(([, a], [, b]) => b - a);
      if (anomalies.length > 0) {
        const [topCat, topVal] = anomalies[0];
        const avg3 = prev3Map[topCat].reduce((s, v) => s + v, 0) / prev3Map[topCat].length;
        insights.push({
          icon: AlertTriangle,
          title: `${topCat} Spike`,
          value: `${fmtINR(topVal)} this month vs ${fmtINR(avg3)} avg — ${Math.round((topVal / avg3 - 1) * 100)}% above normal`,
          color: THEME.gold,
          bg: `${THEME.gold}12`,
        });
      }
    }

    // SIP affordability: flag if total SIP > monthly savings
    const totalSIPAmt = (state.sips || []).reduce(
      (s: number, sip: any) => s + Number(sip.amount || 0),
      0
    );
    if (totalSIPAmt > 0 && metrics.monthIncome > 0) {
      const monthlySavings = metrics.monthIncome - metrics.monthExpense;
      if (totalSIPAmt > monthlySavings && monthlySavings < totalSIPAmt * 0.9) {
        insights.push({
          icon: AlertTriangle,
          title: "SIP Exceeds Savings",
          value: `SIPs ${fmtINR(totalSIPAmt)}/mo · only ${fmtINR(Math.max(0, monthlySavings))} available`,
          color: THEME.rust,
          bg: `${THEME.rust}12`,
        });
      }
    }

    // Credit card interest exposure — alert if carrying revolving balance
    const ccInterestMonthly = (state.creditCards || [])
      .filter(
        (c: any) => (c.status || "").toLowerCase() !== "closed" && Number(c.outstanding || 0) > 0
      )
      .reduce((s: number, c: any) => {
        const annualRate = Number(c.interestRate || 36) / 100;
        return s + (Number(c.outstanding || 0) * annualRate) / 12;
      }, 0);
    if (ccInterestMonthly > 500) {
      insights.push({
        icon: CreditCard,
        title: "CC Interest Risk",
        value: `${fmtINR(Math.round(ccInterestMonthly))}/mo in charges if balances not cleared`,
        color: THEME.rust,
        bg: `${THEME.rust}12`,
      });
    }

    // Annual fee cost across all active cards
    const totalAnnualFees = (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed" && Number(c.annualFee) > 0)
      .reduce((s: number, c: any) => s + Number(c.annualFee), 0);
    const feeCardCount = (state.creditCards || []).filter(
      (c: any) => (c.status || "").toLowerCase() !== "closed" && Number(c.annualFee) > 0
    ).length;
    if (totalAnnualFees > 0) {
      const pctOfIncome =
        annualIncome > 0 ? ((totalAnnualFees / annualIncome) * 100).toFixed(1) : null;
      const sub = pctOfIncome
        ? `${fmtINR(Math.round(totalAnnualFees / 12))}/mo · ${pctOfIncome}% of annual income`
        : `${fmtINR(Math.round(totalAnnualFees / 12))}/mo across ${feeCardCount} card${feeCardCount !== 1 ? "s" : ""}`;
      insights.push({
        icon: CreditCard,
        title: "CC Annual Fees",
        value: `${fmtINRFull(totalAnnualFees)}/yr · ${sub}`,
        color: THEME.gold,
        bg: `${THEME.gold}12`,
      });
    }

    if (insights.length === 0 && metrics.netWorth > 0)
      insights.push({
        icon: Flame,
        title: "All Clear",
        value: "Your finances are on a healthy track",
        color: THEME.sage,
        bg: `${THEME.sage}12`,
      });

    return insights;
  }, [
    metrics,
    state.income,
    state.transactions,
    state.termPlans,
    state.sips,
    state.loansTaken,
    dashboardData,
    state.creditCards,
  ]);

  const ytdData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let labelStart: string;

    if (ytdMode === "fy") {
      const fyParts = (state.profile?.fy || "").split("-");
      // FY "2025-26" starts April 1 2025; if no profile FY, infer from current month
      const fyStartYear =
        Number(fyParts[0]) || (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
      startDate = new Date(fyStartYear, 3, 1); // April 1
      labelStart = `Apr ${fyStartYear}`;
    } else {
      startDate = new Date(now.getFullYear(), 0, 1); // Jan 1
      labelStart = "Jan";
    }

    const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-01`;
    const ytdTxns = (state.transactions || []).filter((t: any) => t.date && t.date >= startStr);
    const ytdTxnIncome = ytdTxns
      .filter((t: any) => t.type === "credit")
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    // Income ledger is the authoritative source (mirrors App.tsx explicitIncome priority)
    const ytdIncomeLedger = (state.income || [])
      .filter((i: any) => i.date && i.date >= startStr)
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const ytdIncome = ytdIncomeLedger > 0 ? ytdIncomeLedger : ytdTxnIncome;
    const ytdTxnExpense = ytdTxns
      .filter((t: any) => t.type === "debit")
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    // Rent payments tracked via rentedProperties.payments are not debit transactions
    const ytdRentPaid = (state.rentedProperties || []).reduce(
      (sum: number, p: any) =>
        sum +
        (p.payments || [])
          .filter((pay: any) => pay.date && pay.date >= startStr)
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0),
      0
    );
    const ytdExpense = ytdTxnExpense + ytdRentPaid;
    const ytdSavings = ytdIncome - ytdExpense;
    const ytdSavingsRate = ytdIncome > 0 ? (ytdSavings / ytdIncome) * 100 : 0;
    const monthsElapsed =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth()) +
      1;
    const monthName = now.toLocaleString("en-IN", { month: "short" });
    return {
      ytdIncome,
      ytdExpense,
      ytdSavings,
      ytdSavingsRate,
      monthsElapsed,
      monthName,
      labelStart,
    };
  }, [state.transactions, state.income, state.rentedProperties, state.profile?.fy, ytdMode]);

  const goalHealth = useMemo(() => {
    const now = new Date();
    const monthlySavings = Math.max(0, metrics.monthIncome - metrics.monthExpense);
    return (state.goals || []).map((g: any) => {
      const targetAmount = Number(g.targetAmount || g.target || 0);
      const savedAmount = Number(g.savedAmount || g.currentAmount || g.saved || 0);
      const gap = Math.max(0, targetAmount - savedAmount);
      const progress = targetAmount > 0 ? Math.min((savedAmount / targetAmount) * 100, 100) : 0;
      const targetDate = g.targetDate || g.deadline;
      let monthsLeft = 0,
        monthlyNeeded = 0,
        onTrack = false;
      if (targetDate) {
        const td = new Date(targetDate);
        monthsLeft = Math.max(0, Math.ceil((td.getTime() - now.getTime()) / (30 * 86400000)));
        monthlyNeeded = monthsLeft > 0 ? gap / monthsLeft : gap;
        onTrack = monthlySavings >= monthlyNeeded && gap > 0 && monthsLeft > 0;
      }
      const achieved = gap === 0;
      return {
        ...g,
        gap,
        monthsLeft,
        monthlyNeeded,
        onTrack,
        progress,
        targetAmount,
        savedAmount,
        achieved,
      };
    });
  }, [state.goals, metrics.monthIncome, metrics.monthExpense]);

  const isPositive = metrics.netWorth >= 0;

  return (
    <div className="tab-content-enter">
      <SectionTitle sub="Executive summary, financial health, and smart insights">
        Executive Dashboard
      </SectionTitle>

      {/* Quick Stats Tiles */}
      {(() => {
        const items = [
          {
            label: "Net Worth",
            value: fmtINRFull(metrics.netWorth),
            color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust,
            Icon: TrendingUp,
          },
          {
            label: "Savings Rate",
            value: metrics.savingsRate.toFixed(1) + "%",
            color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold,
            Icon: Target,
          },
          {
            label: "Monthly Income",
            value: fmtINRFull(metrics.monthIncome),
            color: THEME.sage,
            Icon: ArrowUpRight,
          },
          {
            label: "Monthly Spend",
            value: fmtINRFull(metrics.monthExpense),
            color: THEME.rust,
            Icon: Receipt,
          },
          {
            label: "Est. Tax",
            value: fmtINRFull(metrics.taxDue),
            color: metrics.taxDue > 0 ? THEME.rust : THEME.sage,
            Icon: Landmark,
          },
          ...(momNetWorthDelta
            ? [
                {
                  label: "MoM Change",
                  value: `${momNetWorthDelta.delta >= 0 ? "+" : ""}${fmtINRFull(momNetWorthDelta.delta)}`,
                  color: momNetWorthDelta.delta >= 0 ? THEME.sage : THEME.rust,
                  Icon: momNetWorthDelta.delta >= 0 ? ArrowUpRight : ArrowDownRight,
                },
              ]
            : []),
          ...(metrics.foir > 0
            ? [
                {
                  label: "FOIR",
                  value: `${metrics.foir.toFixed(0)}%`,
                  color:
                    metrics.foir > 50 ? THEME.rust : metrics.foir > 40 ? THEME.gold : THEME.sage,
                  Icon: BarChart2,
                },
              ]
            : []),
        ];
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {items.map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderTop: `3px solid ${color}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: `${color}1f`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={13} color={color} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Sub-tab Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {/* flex: 0 1 auto + min-width: 0 prevents the bar from stretching beyond pill content */}
        <div
          className="demat-portfolio-bar no-scrollbar"
          style={{ flex: "0 1 auto", minWidth: 0, marginBottom: 0 }}
        >
          {subs.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSub(s.id)}
                className={`demat-portfolio-pill ${sub === s.id ? "active" : ""}`}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>
        <div style={{ flexShrink: 0 }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer size={14} />}
            onClick={() => setShowReport(true)}
          >
            Monthly Report
          </Button>
        </div>
      </div>

      {/* ────────────────── SUB-TAB: DASHBOARD ────────────────── */}
      {sub === "dashboard" && (
        <div key="dashboard" className="tab-content-enter">
          {smartInsights.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Smart Insights
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 8px",
                    borderRadius: 20,
                    background: smartInsights.some((ins: any) => ins.color === THEME.rust)
                      ? `${THEME.rust}1f`
                      : `${THEME.gold}1f`,
                    color: smartInsights.some((ins: any) => ins.color === THEME.rust)
                      ? THEME.rust
                      : THEME.gold,
                  }}
                >
                  {smartInsights.length} alert{smartInsights.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 10,
                }}
              >
                {smartInsights.map((ins: any, i: number) => {
                  const Icon = ins.icon;
                  return (
                    <div
                      key={i}
                      className="card-lift"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 16px",
                        borderRadius: 12,
                        background: ins.bg,
                        border: `1px solid ${ins.color}28`,
                        borderLeft: `3px solid ${ins.color}`,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `${ins.color}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={15} color={ins.color} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: ins.color,
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {ins.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: THEME.muted,
                            marginTop: 2,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ins.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="animate-fade-in-up bento-grid">
            {/* Hero Card */}
            {/* #0F172A = same hardcoded dark as Habits hero card — consistent across all themes */}
            <Card
              variant="hero"
              className="bento-col-12"
              style={{
                padding: "32px 40px",
                background: "#0F172A",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* ── Decorative large ₹ watermark — gold, visible on dark & light ── */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: 320,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: "#D97706",
                  opacity: 0.04,
                  pointerEvents: "none",
                  userSelect: "none",
                  zIndex: 0,
                  letterSpacing: "-0.06em",
                }}
              >
                ₹
              </div>

              {netWorthTrend.filter((t: any) => t.value > 0).length > 2 && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 240,
                    height: 110,
                    opacity: 0.1,
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={netWorthTrend.slice(-6)}
                      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="heroSparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34D399" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#34D399"
                        strokeWidth={2.5}
                        fill="url(#heroSparkGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 20,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Golden ₹ coin badge — visible on any background */}
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: "linear-gradient(135deg, #D97706 0%, #FBBF24 55%, #D97706 100%)",
                      boxShadow: "0 0 12px rgba(217,119,6,0.55), 0 2px 6px rgba(0,0,0,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 900,
                      color: "#fff",
                      border: "1.5px solid rgba(251,191,36,0.6)",
                    }}
                  >
                    ₹
                  </div>
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: isPositive ? "#34D399" : "#FB7185",
                      boxShadow: `0 0 8px ${isPositive ? "rgba(52,211,153,0.6)" : "rgba(251,113,133,0.6)"}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.45)",
                      fontWeight: 700,
                    }}
                  >
                    Wealth Overview
                  </span>
                </div>
                <span
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}
                >
                  {new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div style={{ position: "relative", zIndex: 2, marginBottom: 32 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Total Net Worth
                </div>
                <div
                  style={{
                    fontSize: "clamp(42px, 5.5vw, 72px)",
                    fontWeight: 900,
                    lineHeight: 1,
                    letterSpacing: "-0.045em",
                    color: "#fff",
                  }}
                >
                  {fmtINRFull(metrics.netWorth)}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#34D399",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <TrendingUp size={14} />
                    {(
                      ((metrics.mfValue + metrics.stockValue) / (metrics.totalAssets || 1)) *
                      100
                    ).toFixed(1)}
                    % equity ratio
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                    · Total assets {fmtINRFull(metrics.totalAssets)}
                  </div>
                  {momNetWorthDelta && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                        fontWeight: 700,
                        color: momNetWorthDelta.delta >= 0 ? "#34D399" : "#F87171",
                      }}
                    >
                      ·{" "}
                      {momNetWorthDelta.delta >= 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}
                      {momNetWorthDelta.delta >= 0 ? "+" : ""}
                      {fmtINR(momNetWorthDelta.delta)} MoM ({momNetWorthDelta.pct >= 0 ? "+" : ""}
                      {momNetWorthDelta.pct.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "24px 32px",
                  position: "relative",
                  zIndex: 2,
                  paddingTop: 32,
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <HeroStat
                  label="Bank Cash"
                  value={metrics.cashInBanks}
                  tabId="banks"
                  setTab={setTab}
                />
                <HeroStat
                  label="Fixed Deposits"
                  value={metrics.fdValue}
                  tabId="banks"
                  setTab={setTab}
                />
                <HeroStat
                  label="Mutual Funds"
                  value={metrics.mfValue}
                  tabId="investments"
                  setTab={setTab}
                />
                <HeroStat label="Stocks" value={metrics.stockValue} tabId="demat" setTab={setTab} />
                <HeroStat
                  label="PPF / NPS / EPF"
                  value={metrics.ppfValue + metrics.npsValue + metrics.epfValue}
                  tabId="investments"
                  setTab={setTab}
                />
                <HeroStat
                  label="Card Dues"
                  value={metrics.ccOutstanding}
                  negative
                  tabId="credit"
                  setTab={setTab}
                />
                <HeroStat
                  label="Loans Taken"
                  value={metrics.loansTakenValue}
                  negative
                  tabId="banks"
                  setTab={setTab}
                />
                <HeroStat
                  label="Subs / Mo"
                  value={metrics.subTotal}
                  negative
                  tabId="subs"
                  setTab={setTab}
                />
              </div>
            </Card>

            {/* Core Stats Grid Row */}
            <div
              className="bento-col-12"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {/* 1. SAVINGS RATE */}
              <Card
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 20,
                  }}
                >
                  Savings Rate
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%" }}>
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={THEME.line}
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={metrics.savingsRate >= 20 ? THEME.sage : THEME.gold}
                        strokeWidth="4"
                        strokeDasharray={`${Math.max(0, Math.min(100, metrics.savingsRate))}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {metrics.savingsRate.toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 800,
                        color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold,
                        lineHeight: 1,
                        marginBottom: 6,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {metrics.savingsRate.toFixed(1)}%
                    </div>
                    <div
                      style={{ fontSize: 13, color: THEME.muted, marginBottom: 8, fontWeight: 500 }}
                    >
                      of monthly income
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color:
                          metrics.savingsRate >= 20
                            ? THEME.sage
                            : metrics.savingsRate >= 10
                              ? THEME.gold
                              : THEME.rust,
                      }}
                    >
                      {metrics.savingsRate >= 20 ? "On track" : "Needs attention"}
                    </div>
                  </div>
                </div>
              </Card>

              {/* 2. DEBT-TO-ASSET */}
              <Card
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 20,
                  }}
                >
                  Debt-to-Asset Ratio
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 38,
                      fontWeight: 900,
                      color:
                        metrics.debtToAssetRatio < 25
                          ? THEME.sage
                          : metrics.debtToAssetRatio < 40
                            ? THEME.gold
                            : THEME.rust,
                      lineHeight: 1,
                      marginBottom: 10,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {metrics.debtToAssetRatio.toFixed(1)}
                    <span style={{ fontSize: 24 }}>%</span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: `${THEME.line}`,
                      overflow: "hidden",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 4,
                        width: `${Math.min(100, metrics.debtToAssetRatio)}%`,
                        background:
                          metrics.debtToAssetRatio < 25
                            ? THEME.sage
                            : metrics.debtToAssetRatio < 40
                              ? THEME.gold
                              : THEME.rust,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}
                  >
                    <span style={{ fontSize: 10, color: THEME.sage, fontWeight: 700 }}>
                      Safe &lt;25%
                    </span>
                    <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 700 }}>
                      Caution &lt;40%
                    </span>
                    <span style={{ fontSize: 10, color: THEME.rust, fontWeight: 700 }}>
                      High &gt;40%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500 }}>
                    Liabilities {fmtINRFull(metrics.totalLiabilities)}
                  </div>
                </div>
              </Card>

              {/* 3. LIQUIDITY SCORE — uses liquidAssets (cash + MF + stocks), not just cash */}
              <Card
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 20,
                  }}
                >
                  Liquidity Score
                </div>
                <div>
                  {(() => {
                    const liquid = metrics.liquidAssets;
                    const locked = metrics.lockedAssets;
                    const ratio =
                      metrics.totalAssets > 0 ? (liquid / metrics.totalAssets) * 100 : 0;
                    const ratioColor =
                      ratio >= 30 ? THEME.sage : ratio >= 15 ? THEME.gold : THEME.rust;
                    return (
                      <>
                        <div
                          style={{
                            fontSize: 38,
                            fontWeight: 900,
                            color: ratioColor,
                            lineHeight: 1,
                            marginBottom: 10,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {ratio.toFixed(1)}
                          <span style={{ fontSize: 24 }}>%</span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 4,
                            background: `${THEME.line}`,
                            overflow: "hidden",
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 4,
                              width: `${Math.min(100, ratio)}%`,
                              background: ratioColor,
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: THEME.muted,
                            lineHeight: 1.7,
                            fontWeight: 500,
                          }}
                        >
                          Cash {fmtINRFull(metrics.cashInBanks)} · MF+Stocks{" "}
                          {fmtINRFull(metrics.mfValue + metrics.stockValue)}
                          <br />
                          Locked {fmtINRFull(locked)} · Target ≥30%
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Card>

              {/* 4. INVESTMENT P&L */}
              <Card
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 20,
                  }}
                >
                  Investment P&L
                </div>
                <div>
                  {(() => {
                    const invested = metrics.mfInvested + metrics.stockInvested;
                    const current = metrics.mfValue + metrics.stockValue;
                    const pnl = current - invested;
                    const returnPct = invested > 0 ? (pnl / invested) * 100 : 0;
                    const isPos = pnl >= 0;
                    const c = isPos ? THEME.sage : THEME.rust;
                    return (
                      <>
                        <div
                          style={{
                            fontSize: 34,
                            fontWeight: 900,
                            color: c,
                            lineHeight: 1,
                            marginBottom: 10,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {isPos ? "+" : ""}
                          {fmtINRFull(pnl)}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: c,
                            marginBottom: 8,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          {isPos ? (
                            <ChevronUp size={18} strokeWidth={3} />
                          ) : (
                            <ChevronDown size={18} strokeWidth={3} />
                          )}
                          {Math.abs(returnPct).toFixed(1)}% overall return
                        </div>
                        <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>
                          Unrealised · Invested {fmtINRFull(invested)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Card>
            </div>

            {/* Row of Health, Dues, Streak */}
            {(() => {
              const healthScoreData = !healthSimActive
                ? {
                    totalScore: dashboardData.totalScore,
                    scoreColor: dashboardData.scoreColor,
                    statusText: !dashboardData.hasData
                      ? "No Data Yet"
                      : dashboardData.totalScore >= 75
                        ? "Excellent"
                        : dashboardData.totalScore >= 50
                          ? "Good"
                          : "Needs Work",
                    subScores: dashboardData.subScores,
                  }
                : {
                    totalScore:
                      (simSavings ? 25 : dashboardData.subScores[0].score) +
                      (simDebt ? 25 : dashboardData.subScores[1].score) +
                      (simEmerg ? 25 : dashboardData.subScores[2].score) +
                      (simDiv ? 25 : dashboardData.subScores[3].score),
                    get scoreColor() {
                      return this.totalScore >= 75
                        ? THEME.sage
                        : this.totalScore >= 50
                          ? THEME.gold
                          : THEME.rust;
                    },
                    get statusText() {
                      return this.totalScore >= 75
                        ? "Excellent"
                        : this.totalScore >= 50
                          ? "Good"
                          : "Needs Work";
                    },
                    subScores: [
                      {
                        ...dashboardData.subScores[0],
                        score: simSavings ? 25 : dashboardData.subScores[0].score,
                        pct: ((simSavings ? 25 : dashboardData.subScores[0].score) / 25) * 100,
                        color:
                          (simSavings ? 25 : dashboardData.subScores[0].score) >= 25
                            ? THEME.sage
                            : THEME.gold,
                        hint: simSavings
                          ? "Simulated 30% savings rate"
                          : dashboardData.subScores[0].hint,
                      },
                      {
                        ...dashboardData.subScores[1],
                        score: simDebt ? 25 : dashboardData.subScores[1].score,
                        pct: ((simDebt ? 25 : dashboardData.subScores[1].score) / 25) * 100,
                        color:
                          (simDebt ? 25 : dashboardData.subScores[1].score) >= 25
                            ? THEME.sage
                            : THEME.gold,
                        hint: simDebt
                          ? "Simulated debt-free status"
                          : dashboardData.subScores[1].hint,
                      },
                      {
                        ...dashboardData.subScores[2],
                        score: simEmerg ? 25 : dashboardData.subScores[2].score,
                        pct: ((simEmerg ? 25 : dashboardData.subScores[2].score) / 25) * 100,
                        color:
                          (simEmerg ? 25 : dashboardData.subScores[2].score) >= 25
                            ? THEME.sage
                            : THEME.gold,
                        hint: simEmerg
                          ? "Simulated 6 months of buffer"
                          : dashboardData.subScores[2].hint,
                      },
                      {
                        ...dashboardData.subScores[3],
                        score: simDiv ? 25 : dashboardData.subScores[3].score,
                        pct: ((simDiv ? 25 : dashboardData.subScores[3].score) / 25) * 100,
                        color:
                          (simDiv ? 25 : dashboardData.subScores[3].score) >= 25
                            ? THEME.sage
                            : THEME.gold,
                        hint: simDiv
                          ? "Simulated multi-asset mix"
                          : dashboardData.subScores[3].hint,
                      },
                    ],
                  };

              return (
                <Card
                  className="bento-col-4 bento-row-2"
                  style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <span className="section-label" style={{ marginBottom: 0 }}>
                      Financial Health
                    </span>
                    <button
                      onClick={() => setHealthSimActive((p) => !p)}
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: `1px solid ${healthSimActive ? THEME.accent : THEME.line}`,
                        background: healthSimActive ? `${THEME.accent}14` : "transparent",
                        color: healthSimActive ? THEME.accent : THEME.muted,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {healthSimActive ? "Exit Sandbox" : "Sandbox"}
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
                      <svg
                        viewBox="0 0 36 36"
                        style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke={THEME.line}
                          strokeWidth="2.5"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.9"
                          fill="none"
                          stroke={healthScoreData.scoreColor}
                          strokeWidth="3"
                          strokeDasharray={`${dashboardData.hasData || healthSimActive ? healthScoreData.totalScore : 0} 100`}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dasharray 0.6s ease" }}
                        />
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            lineHeight: 1,
                            color: healthScoreData.scoreColor,
                          }}
                        >
                          {dashboardData.hasData || healthSimActive
                            ? healthScoreData.totalScore
                            : "—"}
                        </div>
                        {(dashboardData.hasData || healthSimActive) && (
                          <div style={{ fontSize: 9, fontWeight: 700, color: THEME.muted }}>
                            /100
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ fontSize: 20, fontWeight: 800, color: healthScoreData.scoreColor }}
                      >
                        {healthScoreData.statusText}
                      </div>
                      <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
                        {healthSimActive ? "Simulated Score" : "Overall Score"}
                      </div>
                    </div>
                  </div>

                  {healthSimActive && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: 10,
                        background: "rgba(128,128,128,0.03)",
                        borderRadius: 10,
                        marginBottom: 16,
                      }}
                      className="animate-scale-in"
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: THEME.accent,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Optimization Targets
                      </div>
                      {[
                        {
                          state: simSavings,
                          setter: setSimSavings,
                          label: "Boost savings rate to 30%",
                        },
                        { state: simDebt, setter: setSimDebt, label: "Clear all outstanding debt" },
                        {
                          state: simEmerg,
                          setter: setSimEmerg,
                          label: "Secure 6-mo emergency fund",
                        },
                        { state: simDiv, setter: setSimDiv, label: "Diversify asset allocation" },
                      ].map((x, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            color: THEME.ink,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={x.state}
                            onChange={() => x.setter((p) => !p)}
                            style={{ accentColor: THEME.accent, width: 13, height: 13 }}
                          />
                          <span>{x.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 14 }}>
                    {healthScoreData.subScores.map((s) => (
                      <div key={s.label}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            marginBottom: 3,
                          }}
                        >
                          <span style={{ color: THEME.muted, fontWeight: 600 }}>{s.label}</span>
                          <span style={{ fontWeight: 800, color: s.color }}>
                            {s.score}/{s.max}
                          </span>
                        </div>
                        {s.hint && (
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.muted,
                              marginBottom: 5,
                              opacity: 0.8,
                            }}
                          >
                            {s.hint}
                          </div>
                        )}
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: s.pct + "%", background: s.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })()}

            <Card
              className="bento-col-5 bento-row-2"
              style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}
            >
              <div className="section-label">Upcoming Dues</div>
              {dashboardData.dues.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 0",
                    color: THEME.muted,
                    fontSize: 13,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  No major dues coming up
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12, flex: 1, alignContent: "flex-start" }}>
                  {dashboardData.dues.slice(0, 5).map((d, i) => {
                    const borderColor = d.isFdMaturity
                      ? THEME.sage
                      : d.daysLeft <= 5
                        ? THEME.rust
                        : d.daysLeft <= 14
                          ? THEME.gold
                          : THEME.muted;
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px 10px 0",
                          borderRadius: 12,
                          background: d.isFdMaturity
                            ? `${THEME.sage}09`
                            : d.daysLeft <= 5
                              ? `${THEME.rust}08`
                              : "rgba(128,128,128,0.03)",
                          border: `1px solid ${borderColor}22`,
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: 3,
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            background: borderColor,
                            borderRadius: "12px 0 0 12px",
                          }}
                        />
                        <div style={{ paddingLeft: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                            {d.date}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: d.isFdMaturity ? THEME.sage : THEME.ink,
                            }}
                          >
                            {fmtINR(d.amount)}
                          </div>
                          {d.isFdMaturity ? (
                            <Badge variant="sage" style={{ fontSize: 10, marginTop: 4 }}>
                              Matures in {d.daysLeft}d
                            </Badge>
                          ) : (
                            <Badge
                              variant={d.daysLeft <= 5 ? "rust" : "gold"}
                              style={{ fontSize: 10, marginTop: 4 }}
                            >
                              {d.daysLeft}d left
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card
              className="bento-col-3 bento-row-2"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                height: "100%",
                justifyContent: "center",
              }}
            >
              <div className="section-label" style={{ textAlign: "center" }}>
                Savings Streak
              </div>
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{dashboardData.streakEmoji}</div>
                <div style={{ fontSize: 52, fontWeight: 900, color: THEME.sage, lineHeight: 1 }}>
                  {dashboardData.streak}
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 6, fontWeight: 600 }}>
                  Months Saved
                </div>
                <Badge variant="sage" style={{ marginTop: 12, padding: "5px 12px", fontSize: 11 }}>
                  {dashboardData.streakMsg}
                </Badge>
                {/* Mini month dots — last 12 months */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 5,
                    marginTop: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {streakCalendar.map((t: any, i: number) => {
                    const saved = t.saved;
                    const hasData = t.hasData;
                    return (
                      <div
                        key={i}
                        title={`${t.label} ${t.year}: ${saved ? "+" : hasData ? "−" : "no data"}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: hasData ? (saved ? THEME.sage : THEME.rust) : THEME.line,
                            opacity: hasData ? 1 : 0.4,
                            transition: "background 0.3s ease",
                          }}
                        />
                        <span style={{ fontSize: 8, color: THEME.muted, fontWeight: 600 }}>
                          {t.label.slice(0, 1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Wealth Velocity + EMI Summary Row */}
            <div
              className="bento-col-12"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 20,
              }}
            >
              {/* Wealth Velocity */}
              <Card style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div className="section-label" style={{ marginBottom: 0 }}>
                    Wealth Velocity
                  </div>
                  {wealthVelocity && <Badge variant="muted">{wealthVelocity.months}mo avg</Badge>}
                </div>
                {!wealthVelocity ? (
                  <div style={{ color: THEME.muted, fontSize: 13, padding: "16px 0" }}>
                    Record net worth history for 2+ months to see growth momentum
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                    <div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 900,
                          color: wealthVelocity.avg >= 0 ? THEME.sage : THEME.rust,
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {wealthVelocity.avg >= 0 ? "+" : ""}
                        {fmtINRFull(wealthVelocity.avg)}
                      </div>
                      <div
                        style={{ fontSize: 11, color: THEME.muted, marginTop: 6, fontWeight: 600 }}
                      >
                        avg growth / month
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "grid",
                        gap: 10,
                        paddingLeft: 20,
                        borderLeft: `1px solid ${THEME.line}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: THEME.muted }}>Last month</span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: wealthVelocity.latest >= 0 ? THEME.sage : THEME.rust,
                          }}
                        >
                          {wealthVelocity.latest >= 0 ? "+" : ""}
                          {fmtINR(wealthVelocity.latest)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: THEME.muted }}>Momentum</span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color:
                              wealthVelocity.accel > 0
                                ? THEME.sage
                                : wealthVelocity.accel < 0
                                  ? THEME.gold
                                  : THEME.muted,
                          }}
                        >
                          {wealthVelocity.accel > 0
                            ? "↑ Accelerating"
                            : wealthVelocity.accel < 0
                              ? "↓ Slowing"
                              : "→ Steady"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: THEME.muted }}>At this pace</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                          {wealthVelocity.avg >= 0 ? "+" : ""}
                          {fmtINR(wealthVelocity.avg * 12)}/yr
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* EMI Summary */}
              {(() => {
                const activeLoans = (state.loansTaken || []).filter(
                  (l: any) => Number(l.outstanding || 0) > 0 && Number(l.emi || 0) > 0
                );
                const totalEMI = activeLoans.reduce(
                  (s: number, l: any) => s + Number(l.emi || 0),
                  0
                );
                const foirPct =
                  metrics.monthIncome > 0 ? (totalEMI / metrics.monthIncome) * 100 : 0;
                return (
                  <Card style={{ padding: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <div className="section-label" style={{ marginBottom: 0 }}>
                        Loan EMI Status
                      </div>
                      {activeLoans.length > 0 && (
                        <Badge variant={foirPct > 50 ? "rust" : foirPct > 40 ? "gold" : "sage"}>
                          {foirPct.toFixed(0)}% FOIR
                        </Badge>
                      )}
                    </div>
                    {activeLoans.length === 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 60,
                          color: THEME.sage,
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        No active loans — debt-free!
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: 26,
                            fontWeight: 900,
                            color:
                              foirPct > 50 ? THEME.rust : foirPct > 40 ? THEME.gold : THEME.sage,
                            lineHeight: 1,
                            letterSpacing: "-0.02em",
                            marginBottom: 14,
                          }}
                        >
                          {fmtINRFull(totalEMI)}
                          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
                            /mo
                          </span>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {activeLoans.slice(0, 3).map((l: any, i: number) => {
                            const outstanding = Number(l.outstanding || 0);
                            const emi = Number(l.emi || 0);
                            const rate = Number(l.interestRate || 0) / 12 / 100;
                            let months = 9999;
                            if (rate === 0) months = Math.ceil(outstanding / emi);
                            else {
                              const ratio = (rate * outstanding) / emi;
                              if (ratio < 1)
                                months = Math.ceil(-Math.log(1 - ratio) / Math.log(1 + rate));
                            }
                            const yrs = months < 9999 ? Math.floor(months / 12) : 0;
                            const mo = months < 9999 ? months % 12 : 0;
                            const timeStr =
                              months < 9999 ? (yrs > 0 ? `${yrs}y ${mo}m` : `${mo}m`) : "—";
                            return (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  borderRadius: 8,
                                  background: "rgba(128,128,128,0.03)",
                                  border: `1px solid ${THEME.line}`,
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                                    {l.loanName || l.bank || "Loan"}
                                  </div>
                                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                                    Payoff: {timeStr} · {fmtINR(outstanding)} left
                                  </div>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>
                                  {fmtINR(emi)}/mo
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </Card>
                );
              })()}
            </div>

            {/* Recent Transactions */}
            <Card className="bento-col-12" style={{ padding: 24, marginTop: 4 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div className="section-label" style={{ marginBottom: 0 }}>
                  Recent Ledger Activity
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 3,
                      background: THEME.line,
                      padding: 3,
                      borderRadius: 8,
                    }}
                  >
                    {(["all", "credit", "debit"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTxnFilter(f)}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 700,
                          background: txnFilter === f ? THEME.accent : "transparent",
                          color: txnFilter === f ? "#fff" : THEME.muted,
                          transition: "all 0.2s ease",
                          textTransform: "capitalize" as const,
                        }}
                      >
                        {f === "all" ? "All" : f === "credit" ? "Income" : "Expense"}
                      </button>
                    ))}
                  </div>
                  <Badge variant="muted">{state.transactions.length} total</Badge>
                  {state.transactions.length > 5 && (
                    <button
                      onClick={() => setShowAllTxns((prev) => !prev)}
                      style={{
                        fontSize: 11,
                        color: THEME.accent,
                        background: "none",
                        border: `1px solid ${THEME.accent}44`,
                        cursor: "pointer",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 6,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {showAllTxns ? "Show less" : `Show all ${state.transactions.length}`}
                    </button>
                  )}
                </div>
              </div>
              {state.transactions.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 0",
                    color: THEME.muted,
                    fontSize: 13,
                  }}
                >
                  No transactions yet
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {state.transactions
                    .slice()
                    .sort(
                      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .filter((t: any) => txnFilter === "all" || t.type === txnFilter)
                    .slice(0, showAllTxns ? undefined : 5)
                    .map((t: any) => (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          borderRadius: 12,
                          background: "rgba(128,128,128,0.03)",
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background:
                                t.type === "credit" ? `${THEME.sage}1f` : `${THEME.rust}1f`,
                              color: t.type === "credit" ? THEME.sage : THEME.rust,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {t.type === "credit" ? <TrendingUp size={18} /> : <Receipt size={18} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                              {t.note || t.category || "Transaction"}
                            </div>
                            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                              {t.date
                                ? new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                              {t.category ? ` · ${t.category}` : ""}
                              {(() => {
                                const bank = (state.bankAccounts || []).find((b: any) => b.id === t.accountId);
                                if (!bank) return null;
                                const last4 = bank.accountNumber ? bank.accountNumber.slice(-4) : "";
                                return (
                                  <>
                                    {" · "}
                                    {bank.bankName}
                                    {last4 && (
                                      <span style={{ marginLeft: 4 }}>
                                        (<Prv>•••• {last4}</Prv>)
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: t.type === "credit" ? THEME.sage : THEME.rust,
                            }}
                          >
                            {t.type === "credit" ? "+" : "-"}
                            {fmtINR(t.amount)}
                          </div>
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 4,
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.04em",
                              background:
                                t.type === "credit" ? `${THEME.sage}1a` : `${THEME.rust}1a`,
                              color: t.type === "credit" ? THEME.sage : THEME.rust,
                            }}
                          >
                            {t.type === "credit" ? "▲ Credit" : "▼ Debit"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ────────────────── SUB-TAB: TRENDS ────────────────── */}
      {sub === "trends" && (
        <div key="trends" className="tab-content-enter">
          {/* Net Worth Growth */}
          <Card style={{ marginBottom: 28, padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div className="section-label" style={{ marginBottom: 0 }}>
                Net Worth Growth
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 3,
                  background: THEME.line,
                  padding: 3,
                  borderRadius: 8,
                }}
              >
                {(["3M", "6M", "12M", "All"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setTrendPeriod(p)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      background: trendPeriod === p ? THEME.accent : "transparent",
                      color: trendPeriod === p ? "#fff" : THEME.muted,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {filteredNetWorthTrend.length === 0 ||
            filteredNetWorthTrend.every((t) => t.value === 0) ? (
              <div
                style={{
                  height: 280,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.muted,
                  fontSize: 13,
                  background: "rgba(128,128,128,0.03)",
                  borderRadius: 12,
                }}
              >
                Not enough history to show net worth trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={filteredNetWorthTrend}>
                  <defs>
                    <linearGradient id="gNw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={THEME.accent} stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="4"
                        stdDeviation="6"
                        floodColor={THEME.accent}
                        floodOpacity="0.5"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
                  <Tooltip
                    formatter={(v: any) => fmtINRFull(v)}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--t-line)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-xl)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={THEME.accent}
                    strokeWidth={3}
                    fill="url(#gNw)"
                    style={{ filter: "url(#glow)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Historical P&L Bar Chart */}
          <Card style={{ marginBottom: 28, padding: 24 }}>
            <div className="section-label">Monthly P&L (Last 6 Months)</div>
            {trendData.filter((t) => t.income > 0 || t.expense > 0).length === 0 ? (
              <div
                style={{
                  height: 250,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.muted,
                  fontSize: 13,
                  background: "rgba(128,128,128,0.03)",
                  borderRadius: 12,
                }}
              >
                Add transactions to see your P&L trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData.slice(-6)}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.rust} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.rust} stopOpacity={0.4} />
                    </linearGradient>
                    <filter id="glow-sage" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="4"
                        floodColor={THEME.sage}
                        floodOpacity="0.4"
                      />
                    </filter>
                    <filter id="glow-rust" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="4"
                        floodColor={THEME.rust}
                        floodOpacity="0.4"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtINR}
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => fmtINRFull(v)}
                    cursor={{ fill: THEME.line, opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--t-line)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-xl)",
                    }}
                  />
                  <Legend iconType="circle" />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="url(#gIncome)"
                    radius={[4, 4, 0, 0]}
                    style={{ filter: "url(#glow-sage)" }}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill="url(#gExpense)"
                    radius={[4, 4, 0, 0]}
                    style={{ filter: "url(#glow-rust)" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}
          >
            {/* Monthly Net Savings — shows net (income minus expense) per month */}
            <Card style={{ padding: 24 }}>
              <div className="section-label">Monthly Net Savings</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData.slice(-6)}>
                  <defs>
                    <linearGradient id="gNetPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.3} />
                    </linearGradient>
                    <linearGradient id="gNetNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.rust} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.rust} stopOpacity={0.3} />
                    </linearGradient>
                    <filter id="glow-net" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow
                        dx="0"
                        dy="2"
                        stdDeviation="4"
                        floodColor={THEME.accent}
                        floodOpacity="0.4"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtINR}
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => [fmtINRFull(v), "Net Savings"]}
                    cursor={{ fill: THEME.line, opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--t-line)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-xl)",
                    }}
                  />
                  <Bar
                    dataKey="net"
                    name="Net Savings"
                    radius={[4, 4, 0, 0]}
                    style={{ filter: "url(#glow-net)" }}
                  >
                    {trendData.slice(-6).map((entry: any, index: number) => (
                      <Cell
                        key={index}
                        fill={entry.net >= 0 ? THEME.sage : THEME.rust}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Portfolio Return */}
            <Card style={{ padding: 24 }}>
              <div className="section-label">Portfolio Return</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[
                    {
                      name: "Mutual Funds",
                      current: metrics.mfValue,
                      invested: metrics.mfInvested,
                    },
                    {
                      name: "Stocks",
                      current: metrics.stockValue,
                      invested: metrics.stockInvested,
                    },
                  ]}
                >
                  <defs>
                    <linearGradient id="gCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="gInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.muted} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={THEME.muted} stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtINR}
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => fmtINRFull(v)}
                    cursor={{ fill: THEME.line, opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--t-line)",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-xl)",
                    }}
                  />
                  <Legend iconType="circle" />
                  <Bar
                    dataKey="current"
                    name="Current Value"
                    fill="url(#gCurrent)"
                    radius={[4, 4, 0, 0]}
                    style={{ filter: "url(#glow-sage)" }}
                  />
                  <Bar
                    dataKey="invested"
                    name="Invested"
                    fill="url(#gInvested)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* YTD Cumulative block */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>
                  Year-to-Date Performance
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  {ytdData.labelStart} – {ytdData.monthName} {new Date().getFullYear()} ·{" "}
                  {ytdData.monthsElapsed} month{ytdData.monthsElapsed > 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(["fy", "cal"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setYtdMode(mode)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${ytdMode === mode ? THEME.accent : THEME.line}`,
                      background: ytdMode === mode ? `${THEME.accent}1a` : "transparent",
                      color: ytdMode === mode ? THEME.accent : THEME.muted,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {mode === "fy" ? "FY (Apr–Mar)" : "CY (Jan–Dec)"}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 16,
              }}
            >
              {[
                { label: "YTD Income", value: fmtINRFull(ytdData.ytdIncome), color: THEME.sage },
                { label: "YTD Expense", value: fmtINRFull(ytdData.ytdExpense), color: THEME.rust },
                {
                  label: "YTD Savings",
                  value: fmtINRFull(ytdData.ytdSavings),
                  color: ytdData.ytdSavings >= 0 ? THEME.sage : THEME.rust,
                },
                {
                  label: "YTD Savings Rate",
                  value: ytdData.ytdSavingsRate.toFixed(1) + "%",
                  color:
                    ytdData.ytdSavingsRate >= 20
                      ? THEME.sage
                      : ytdData.ytdSavingsRate >= 10
                        ? THEME.gold
                        : THEME.rust,
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    padding: 16,
                    background: `${color}09`,
                    borderRadius: 12,
                    borderTop: `4px solid ${color}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: "-0.02em" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ────────────────── SUB-TAB: ALLOCATION ────────────────── */}
      {sub === "allocation" && (
        <div key="allocation" className="tab-content-enter">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
              marginBottom: 28,
            }}
          >
            {/* Asset Allocation */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div className="section-label" style={{ marginBottom: 2 }}>
                    Asset Allocation
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    {selectedAssetClass
                      ? `Drill down: ${selectedAssetClass}`
                      : "Interactive asset diversification map"}
                  </div>
                </div>
                {selectedAssetClass && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAssetClass(null);
                      setActiveAssetIndex(null);
                    }}
                    style={{
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                    }}
                  >
                    <ChevronLeft size={14} /> Back
                  </Button>
                )}
              </div>

              {assetBreakdown?.length === 0 ? (
                <div
                  style={{
                    height: 300,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: THEME.muted,
                    fontSize: 13,
                    background: "rgba(128,128,128,0.03)",
                    borderRadius: 12,
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  Add assets in Bank Accounts, Demat, or Fixed Income to see allocation.
                </div>
              ) : (
                <div
                  className="allocation-interactive-container"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 24,
                    minHeight: 300,
                  }}
                >
                  {/* Left Side: Donut Chart with central display */}
                  <div
                    style={{
                      flex: "1 1 240px",
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={assetBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={92}
                          paddingAngle={2}
                          onMouseEnter={(_, index) => setActiveAssetIndex(index)}
                          onMouseLeave={() => setActiveAssetIndex(null)}
                          onClick={(_, index) => {
                            const selectedName = assetBreakdown[index]?.name;
                            setSelectedAssetClass(
                              selectedName === selectedAssetClass ? null : selectedName
                            );
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {assetBreakdown.map((item: any, i: number) => {
                            const isSelected = selectedAssetClass === item.name;
                            const isHovered = activeAssetIndex === i;
                            return (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[i % PIE_COLORS.length]}
                                opacity={
                                  selectedAssetClass
                                    ? isSelected
                                      ? 1
                                      : 0.4
                                    : activeAssetIndex !== null
                                      ? isHovered
                                        ? 1
                                        : 0.6
                                      : 1
                                }
                                style={{
                                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  transform: isHovered || isSelected ? "scale(1.03)" : "scale(1)",
                                  transformOrigin: "center",
                                }}
                              />
                            );
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Central display inside the donut hole */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                        pointerEvents: "none",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        width: 130,
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: THEME.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 2,
                        }}
                      >
                        {activeAssetIndex !== null
                          ? assetBreakdown[activeAssetIndex]?.name
                          : selectedAssetClass
                            ? selectedAssetClass
                            : "Total Assets"}
                      </span>
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 900,
                          color: THEME.ink,
                          letterSpacing: "-0.02em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%",
                        }}
                      >
                        {fmtINRFull(
                          activeAssetIndex !== null
                            ? assetBreakdown[activeAssetIndex]?.value
                            : selectedAssetClass
                              ? assetBreakdown.find((x) => x.name === selectedAssetClass)?.value ||
                                0
                              : metrics.totalAssets
                        )}
                      </span>
                      <span
                        style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, marginTop: 2 }}
                      >
                        {(() => {
                          const val =
                            activeAssetIndex !== null
                              ? assetBreakdown[activeAssetIndex]?.value
                              : selectedAssetClass
                                ? assetBreakdown.find((x) => x.name === selectedAssetClass)
                                    ?.value || 0
                                : metrics.totalAssets;
                          const total = metrics.totalAssets || 1;
                          return `${((val / total) * 100).toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Interactive detail list and sub-asset drill-down */}
                  <div
                    style={{
                      flex: "1 1 240px",
                      maxHeight: 260,
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {selectedAssetClass ? (
                      // DRILL DOWN SUB-LIST FOR SELECTED CLASS
                      <div style={{ display: "grid", gap: 10 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            display: "flex",
                            justifyContent: "space-between",
                            borderBottom: `1px solid ${THEME.line}`,
                            paddingBottom: 6,
                          }}
                        >
                          <span>Holding Breakdown</span>
                          <span>Value</span>
                        </div>
                        {(() => {
                          const subList = getSubAssets(selectedAssetClass);
                          if (subList.length === 0) {
                            return (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: THEME.muted,
                                  padding: "12px 0",
                                  textAlign: "center",
                                }}
                              >
                                No holdings recorded
                              </div>
                            );
                          }
                          return subList.map((item, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: "rgba(128,128,128,0.03)",
                                border: `1px solid ${THEME.line}`,
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {item.name}
                                </div>
                                {item.sub && (
                                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                                    {item.sub}
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                                {fmtINR(item.value)}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      // OVERALL ALLOCATION LIST
                      <div style={{ display: "grid", gap: 8 }}>
                        {assetBreakdown.map((item: any, i: number) => {
                          const isHovered = activeAssetIndex === i;
                          const color = PIE_COLORS[i % PIE_COLORS.length];
                          const pct = ((item.value / (metrics.totalAssets || 1)) * 100).toFixed(1);
                          return (
                            <div
                              key={i}
                              onMouseEnter={() => setActiveAssetIndex(i)}
                              onMouseLeave={() => setActiveAssetIndex(null)}
                              onClick={() => setSelectedAssetClass(item.name)}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: isHovered
                                  ? "rgba(128,128,128,0.05)"
                                  : "rgba(128,128,128,0.02)",
                                border: isHovered
                                  ? `1px solid ${color}`
                                  : `1px solid ${THEME.line}`,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                <div
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: color,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {item.name}
                                </span>
                                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                                  {pct}%
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: THEME.ink,
                                  marginLeft: 8,
                                }}
                              >
                                {fmtINR(item.value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Asset vs Liability */}
            <Card style={{ padding: 24 }}>
              <div className="section-label">Asset vs Liability</div>
              <div
                style={{
                  height: 300,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 32,
                }}
              >
                <div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}
                  >
                    <span style={{ fontWeight: 700 }}>Total Assets</span>
                    <span style={{ fontWeight: 800, color: THEME.sage }}>
                      {fmtINRFull(metrics.totalAssets)}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill progress-fill-sage" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}
                  >
                    <span style={{ fontWeight: 700 }}>Total Liabilities</span>
                    <span style={{ fontWeight: 800, color: THEME.rust }}>
                      {fmtINRFull(metrics.totalLiabilities)}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill progress-fill-rust"
                      style={{
                        width:
                          (metrics.totalAssets > 0
                            ? (metrics.totalLiabilities / metrics.totalAssets) * 100
                            : 0) + "%",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    paddingTop: 20,
                    borderTop: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>
                    Net Worth Equity
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 900,
                      color: isPositive ? THEME.accent : THEME.rust,
                    }}
                  >
                    {fmtINRFull(metrics.netWorth)}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Last Trading Day Performance */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 12 }}>
              Last Trading Day Performance:
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {/* Gaining Card */}
              <Card
                style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.sage,
                  }}
                >
                  <span style={{ fontSize: 14 }}>▲</span> {lastTradingDayPerformance.gainingCount}{" "}
                  Stock Gaining
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: THEME.ink }}>
                  {lastTradingDayPerformance.topGainer
                    ? lastTradingDayPerformance.topGainer.name
                    : "-"}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    ₹
                    {lastTradingDayPerformance.topGainer
                      ? Number(lastTradingDayPerformance.topGainer.price.toFixed(1)).toLocaleString(
                          "en-IN"
                        )
                      : "0"}
                  </span>
                  {lastTradingDayPerformance.topGainer && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.sage }}>
                      +{lastTradingDayPerformance.topGainer.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </Card>

              {/* Losing Card */}
              <Card
                style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.rust,
                  }}
                >
                  <span style={{ fontSize: 14 }}>▼</span> {lastTradingDayPerformance.losingCount}{" "}
                  Stock Losing
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: THEME.ink }}>
                  {lastTradingDayPerformance.topLoser
                    ? lastTradingDayPerformance.topLoser.name
                    : "-"}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    ₹
                    {lastTradingDayPerformance.topLoser
                      ? Number(lastTradingDayPerformance.topLoser.price.toFixed(1)).toLocaleString(
                          "en-IN"
                        )
                      : "0"}
                  </span>
                  {lastTradingDayPerformance.topLoser && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.rust }}>
                      {lastTradingDayPerformance.topLoser.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </Card>

              {/* No Change Card */}
              <Card
                style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.muted,
                  }}
                >
                  ● {lastTradingDayPerformance.noChangeCount} Flat / Unchanged
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: THEME.ink }}>
                  {lastTradingDayPerformance.noChangeStocks &&
                  lastTradingDayPerformance.noChangeStocks.length > 0
                    ? lastTradingDayPerformance.noChangeStocks
                        .slice(0, 2)
                        .map((x: any) => x.name)
                        .join(", ")
                    : "No flat stocks"}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: THEME.muted }}>
                    {lastTradingDayPerformance.noChangeStocks &&
                    lastTradingDayPerformance.noChangeStocks.length > 0
                      ? `₹${Number(lastTradingDayPerformance.noChangeStocks.reduce((sum: number, x: any) => sum + x.price, 0).toFixed(0)).toLocaleString("en-IN")}`
                      : "₹0"}
                  </span>
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                    combined price
                  </span>
                </div>
              </Card>
            </div>
          </div>

          {/* Equity Insights (Sectors and Market Caps) */}
          <Card style={{ padding: 24, marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>
                  Equity Sector & Cap Insights
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Portfolio diversification by sector and market capitalization
                </div>
              </div>
              <Badge variant="muted">Live Data</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              {/* Sector Breakdown */}
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.ink,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Building2 size={16} /> Top 10 Sectors
                </div>
                {metrics.stockSectorBreakdown?.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 0",
                      textAlign: "center",
                      color: THEME.muted,
                      fontSize: 13,
                      background: "rgba(128,128,128,0.03)",
                      borderRadius: 12,
                    }}
                  >
                    Add stocks in the Demat tab to see sector analysis
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {(() => {
                      const totalSectorVal = metrics.stockSectorBreakdown.reduce(
                        (sum: number, s: any) => sum + s.value,
                        0
                      );
                      const maxVal = metrics.stockSectorBreakdown[0].value;
                      return metrics.stockSectorBreakdown.slice(0, 10).map((s: any, i: number) => {
                        const barPct = (s.value / maxVal) * 100;
                        const portfolioPct =
                          totalSectorVal > 0
                            ? ((s.value / totalSectorVal) * 100).toFixed(1)
                            : "0.0";
                        return (
                          <div key={s.name}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: 12,
                                marginBottom: 6,
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{s.name}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: PIE_COLORS[i % PIE_COLORS.length],
                                    background: PIE_COLORS[i % PIE_COLORS.length] + "18",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                  }}
                                >
                                  {portfolioPct}%
                                </span>
                                <span style={{ fontWeight: 700, color: THEME.muted }}>
                                  {fmtINR(s.value)}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                height: 6,
                                background: THEME.line,
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: barPct + "%",
                                  background: PIE_COLORS[i % PIE_COLORS.length],
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Market Cap Breakdown */}
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.ink,
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={16} /> Market Cap Allocation
                  </span>
                  {selectedCapClass && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCapClass(null);
                        setActiveCapIndex(null);
                      }}
                      style={{
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        padding: "2px 6px",
                      }}
                    >
                      <ChevronLeft size={12} /> Back
                    </Button>
                  )}
                </div>
                {metrics.stockCapBreakdown?.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 0",
                      textAlign: "center",
                      color: THEME.muted,
                      fontSize: 13,
                      background: "rgba(128,128,128,0.03)",
                      borderRadius: 12,
                    }}
                  >
                    No market cap data available
                  </div>
                ) : (
                  <div
                    className="allocation-interactive-container"
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    {/* Left Side: Donut Chart with central HUD */}
                    <div
                      style={{
                        flex: "1 1 160px",
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={metrics.stockCapBreakdown}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={74}
                            paddingAngle={3}
                            onMouseEnter={(_, index) => setActiveCapIndex(index)}
                            onMouseLeave={() => setActiveCapIndex(null)}
                            onClick={(_, index) => {
                              const selectedName = metrics.stockCapBreakdown[index]?.name;
                              setSelectedCapClass(
                                selectedName === selectedCapClass ? null : selectedName
                              );
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {metrics.stockCapBreakdown.map((item: any, i: number) => {
                              const isSelected = selectedCapClass === item.name;
                              const isHovered = activeCapIndex === i;
                              return (
                                <Cell
                                  key={i}
                                  fill={["#818CF8", "#34D399", "#FBBF24", "#F87171"][i % 4]}
                                  opacity={
                                    selectedCapClass
                                      ? isSelected
                                        ? 1
                                        : 0.4
                                      : activeCapIndex !== null
                                        ? isHovered
                                          ? 1
                                          : 0.6
                                        : 1
                                  }
                                  style={{
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    transform: isHovered || isSelected ? "scale(1.03)" : "scale(1)",
                                    transformOrigin: "center",
                                  }}
                                />
                              );
                            })}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* HUD overlay inside the donut hole */}
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          textAlign: "center",
                          pointerEvents: "none",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          width: 100,
                          zIndex: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            width: "100%",
                          }}
                        >
                          {activeCapIndex !== null
                            ? metrics.stockCapBreakdown[activeCapIndex]?.name
                            : selectedCapClass
                              ? selectedCapClass
                              : "Total Stocks"}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: THEME.ink,
                            letterSpacing: "-0.02em",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            width: "100%",
                          }}
                        >
                          {fmtINR(
                            activeCapIndex !== null
                              ? metrics.stockCapBreakdown[activeCapIndex]?.value
                              : selectedCapClass
                                ? metrics.stockCapBreakdown.find((x) => x.name === selectedCapClass)
                                    ?.value || 0
                                : metrics.stockValue
                          )}
                        </span>
                        <span
                          style={{ fontSize: 10, fontWeight: 700, color: THEME.sage, marginTop: 1 }}
                        >
                          {(() => {
                            const val =
                              activeCapIndex !== null
                                ? metrics.stockCapBreakdown[activeCapIndex]?.value
                                : selectedCapClass
                                  ? metrics.stockCapBreakdown.find(
                                      (x) => x.name === selectedCapClass
                                    )?.value || 0
                                  : metrics.stockValue;
                            const total = metrics.stockValue || 1;
                            return `${((val / total) * 100).toFixed(1)}%`;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Interactive detail list & holdings drill-down */}
                    <div
                      style={{
                        flex: "1 1 180px",
                        maxHeight: 180,
                        overflowY: "auto",
                        paddingRight: 4,
                      }}
                    >
                      {selectedCapClass ? (
                        // DRILL DOWN LIST (STOCKS UNDER ACTIVE CAP)
                        <div style={{ display: "grid", gap: 6 }}>
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              display: "flex",
                              justifyContent: "space-between",
                              borderBottom: `1px solid ${THEME.line}`,
                              paddingBottom: 4,
                            }}
                          >
                            <span>Stock</span>
                            <span>Value</span>
                          </div>
                          {(() => {
                            const subList = getStockCapAssets(selectedCapClass);
                            if (subList.length === 0) {
                              return (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: THEME.muted,
                                    padding: "8px 0",
                                    textAlign: "center",
                                  }}
                                >
                                  No holdings
                                </div>
                              );
                            }
                            return subList.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  background: "rgba(128,128,128,0.03)",
                                  border: `1px solid ${THEME.line}`,
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1, marginRight: 6 }}>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: THEME.ink,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {item.name}
                                  </div>
                                  {item.sub && (
                                    <div style={{ fontSize: 9, color: THEME.muted, marginTop: 1 }}>
                                      {item.sub}
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>
                                  {fmtINR(item.value)}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      ) : (
                        // OVERALL MARKET CAP LIST
                        <div style={{ display: "grid", gap: 6 }}>
                          {metrics.stockCapBreakdown.map((item: any, i: number) => {
                            const isHovered = activeCapIndex === i;
                            const color = ["#818CF8", "#34D399", "#FBBF24", "#F87171"][i % 4];
                            const pct = ((item.value / (metrics.stockValue || 1)) * 100).toFixed(1);
                            return (
                              <div
                                key={i}
                                onMouseEnter={() => setActiveCapIndex(i)}
                                onMouseLeave={() => setActiveCapIndex(null)}
                                onClick={() => setSelectedCapClass(item.name)}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  background: isHovered
                                    ? "rgba(128,128,128,0.05)"
                                    : "rgba(128,128,128,0.02)",
                                  border: isHovered
                                    ? `1px solid ${color}`
                                    : `1px solid ${THEME.line}`,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    minWidth: 0,
                                    flex: 1,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: color,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: THEME.ink,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {item.name}
                                  </span>
                                  <span
                                    style={{ fontSize: 9, color: THEME.muted, fontWeight: 600 }}
                                  >
                                    {pct}%
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: THEME.ink,
                                    marginLeft: 6,
                                  }}
                                >
                                  {fmtINR(item.value)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Top 10 Portfolio Holdings */}
          <Card style={{ padding: 24, marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>
                  Top 10 Portfolio Holdings
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Your largest stock holdings by current value and portfolio share
                </div>
              </div>
              <Badge variant="accent">{topHoldings.length} stocks</Badge>
            </div>
            {topHoldings.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: THEME.muted,
                  fontSize: 13,
                  background: "rgba(128,128,128,0.03)",
                  borderRadius: 12,
                }}
              >
                Add stocks in the Demat tab to see top holdings breakdown
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "16px 24px",
                }}
              >
                {topHoldings.map((h: any) => (
                  <div
                    key={h.yfSym}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(128,128,128,0.03)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <StockLogo yfSym={h.yfSym} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                          {h.base}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                          {fmtINR(h.totalValue)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          className="progress-track"
                          style={{ flex: 1, height: 6, margin: 0, background: THEME.line }}
                        >
                          <div
                            className="progress-fill"
                            style={{
                              width: `${h.percentage}%`,
                              height: 6,
                              background: THEME.accent,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: THEME.muted,
                            minWidth: 35,
                            textAlign: "right",
                          }}
                        >
                          {h.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Passive Income Breakdown */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>
                  Passive Income Ratio
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Total multi-stream yields vs active income
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color:
                      passiveIncomeData.passiveRatio >= 50
                        ? THEME.sage
                        : passiveIncomeData.passiveRatio >= 20
                          ? THEME.gold
                          : THEME.accent,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {passiveIncomeData.passiveRatio.toFixed(1)}%
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: THEME.muted,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                  }}
                >
                  of income
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {[
                {
                  label: "Rental / Mo",
                  value: passiveIncomeData.rentalMonthly,
                  icon: Building2,
                  color: "#059669",
                  bg: "#05966915",
                },
                {
                  label: "FD Yield / Mo",
                  value: passiveIncomeData.fdMonthly,
                  icon: Landmark,
                  color: "#d97706",
                  bg: "#d9770615",
                },
                {
                  label: "RD Yield / Mo",
                  value: passiveIncomeData.rdMonthly,
                  icon: Activity,
                  color: "#0891b2",
                  bg: "#0891b215",
                },
                {
                  label: "Savings Int. / Mo",
                  value: passiveIncomeData.savingsMonthly,
                  icon: Receipt,
                  color: "#10b981",
                  bg: "#10b98115",
                },
                {
                  label: "Stock Divs / Mo",
                  value: passiveIncomeData.stockDividendsMonthly,
                  icon: TrendingUp,
                  color: THEME.accent,
                  bg: `${THEME.accent}15`,
                },
                {
                  label: "MF Yield / Mo",
                  value: passiveIncomeData.mfYieldMonthly,
                  icon: Zap,
                  color: "#a78bfa",
                  bg: "#a78bfa15",
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  style={{
                    padding: 14,
                    background: bg,
                    borderRadius: 12,
                    border: `1px solid ${color}1c`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={12} color="#fff" />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: THEME.ink,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {fmtINRFull(value)}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(128,128,128,0.04)",
                borderRadius: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: THEME.muted,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Total Passive / Month
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: THEME.sage,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {fmtINRFull(passiveIncomeData.totalPassive)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 6 }}>
                  50%+ → Semi-FI
                </div>
                <div style={{ fontSize: 11, color: THEME.muted }}>100% → Full FI</div>
              </div>
            </div>
          </Card>

          {/* Portfolio Rebalancing */}
          <Card style={{ padding: 24, marginTop: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>
                  Portfolio Rebalancing
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Set target allocation and see how much to buy/sell per asset class
                </div>
              </div>
              <Badge variant="accent">Target vs Actual</Badge>
            </div>

            {(() => {
              const equity = (metrics.mfValue || 0) + (metrics.stockValue || 0);
              const debt =
                (metrics.fdValue || 0) +
                (metrics.rdValue || 0) +
                (metrics.bondValue || 0) +
                (metrics.ppfValue || 0) +
                (metrics.npsValue || 0) +
                (metrics.epfValue || 0) +
                (metrics.licValue || 0) +
                (metrics.investmentValue || 0);
              const cash = metrics.cashInBanks || 0;
              const other = Math.max(0, (metrics.totalAssets || 0) - equity - debt - cash);
              const total = equity + debt + cash + other;

              const actual = {
                equity: total > 0 ? (equity / total) * 100 : 0,
                debt: total > 0 ? (debt / total) * 100 : 0,
                cash: total > 0 ? (cash / total) * 100 : 0,
                other: total > 0 ? (other / total) * 100 : 0,
              };

              const classes = [
                {
                  key: "equity",
                  label: "Equity",
                  actualPct: actual.equity,
                  actualVal: equity,
                  color: THEME.accent,
                  icon: TrendingUp,
                },
                {
                  key: "debt",
                  label: "Debt",
                  actualPct: actual.debt,
                  actualVal: debt,
                  color: "#f59e0b",
                  icon: Landmark,
                },
                {
                  key: "cash",
                  label: "Cash",
                  actualPct: actual.cash,
                  actualVal: cash,
                  color: "#22c55e",
                  icon: Activity,
                },
                {
                  key: "other",
                  label: "Other",
                  actualPct: actual.other,
                  actualVal: other,
                  color: "#94a3b8",
                  icon: Receipt,
                },
              ] as const;

              const totalTarget =
                rebalTargets.equity + rebalTargets.debt + rebalTargets.cash + rebalTargets.other;

              return (
                <>
                  {/* Sliders */}
                  <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                    {classes.map(({ key, label, actualPct, color }) => {
                      const targetPct = rebalTargets[key];
                      return (
                        <div key={key}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 6,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: color,
                                }}
                              />
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: 12, color: THEME.muted }}>
                                Actual: <b style={{ color: THEME.ink }}>{actualPct.toFixed(1)}%</b>
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, color }}>Target:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={targetPct}
                                  onChange={(e) =>
                                    setRebalTargets((prev) => ({
                                      ...prev,
                                      [key]: Math.max(
                                        0,
                                        Math.min(100, Number(e.target.value) || 0)
                                      ),
                                    }))
                                  }
                                  style={{
                                    width: 52,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    border: `1px solid ${color}33`,
                                    background: `${color}08`,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color,
                                    outline: "none",
                                    textAlign: "center" as const,
                                  }}
                                />
                                <span style={{ fontSize: 12, color }}>%</span>
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              position: "relative",
                              height: 10,
                              background: THEME.line,
                              borderRadius: 5,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(actualPct, 100)}%`,
                                background: color,
                                borderRadius: 5,
                                opacity: 0.4,
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                height: "100%",
                                width: 2,
                                marginLeft: `${Math.min(targetPct, 100)}%`,
                                background: color,
                                boxShadow: `0 0 4px ${color}`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {totalTarget !== 100 && (
                      <div style={{ fontSize: 11, color: THEME.rust, fontWeight: 600 }}>
                        Targets sum to {totalTarget}% — adjust to total 100%
                      </div>
                    )}
                  </div>

                  {/* Action plan table */}
                  <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 16 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.05em",
                        marginBottom: 12,
                      }}
                    >
                      Rebalancing Action Plan
                    </div>
                    {total === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          fontSize: 13,
                          color: THEME.muted,
                          padding: "16px 0",
                        }}
                      >
                        Add assets to see rebalancing recommendations
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        {classes.map(({ key, label, actualPct, actualVal, color }) => {
                          const targetPct = rebalTargets[key];
                          const targetVal = (targetPct / 100) * total;
                          const diff = targetVal - actualVal;
                          const absDiff = Math.abs(diff);
                          const isBuy = diff > 0;
                          if (absDiff < 1000) return null;
                          return (
                            <div
                              key={key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "12px 14px",
                                borderRadius: 10,
                                background: isBuy ? `${THEME.sage}09` : `${THEME.rust}09`,
                                border: `1px solid ${isBuy ? `${THEME.sage}26` : `${THEME.rust}1f`}`,
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 9,
                                  background: color + "15",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: color,
                                  }}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                                  {actualPct.toFixed(1)}% → target {targetPct}%
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: isBuy ? THEME.sage : THEME.rust,
                                  }}
                                >
                                  {isBuy ? "+" : "−"}
                                  {fmtINR(absDiff)}
                                </div>
                                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                                  {isBuy ? "Buy / Add" : "Reduce"}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {classes.every(
                          ({ key, actualVal }) =>
                            Math.abs((rebalTargets[key] / 100) * total - actualVal) < 1000
                        ) && (
                          <div
                            style={{
                              textAlign: "center",
                              fontSize: 13,
                              color: THEME.sage,
                              padding: "12px 0",
                            }}
                          >
                            Portfolio is balanced — all classes within ₹1K of target
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      )}

      {/* ────────────────── SUB-TAB: PLANNING (NEW!) ────────────────── */}
      {sub === "planning" && (
        <div key="planning" className="tab-content-enter">
          {/* FIRE Progress */}
          <Card style={{ padding: 24, marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>
                  FIRE Progress — Financial Independence
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  25× annual expenses rule · the corpus you need to never work again
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: fireData.progress >= 100 ? THEME.sage : THEME.accent,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {fireData.progress.toFixed(1)}%
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  achieved
                </div>
              </div>
            </div>
            {fireData.fireCorpus > 0 ? (
              <>
                <div
                  style={{
                    height: 10,
                    background: THEME.line,
                    borderRadius: 5,
                    overflow: "hidden",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: fireData.progress + "%",
                      background:
                        fireData.progress >= 100
                          ? THEME.sage
                          : fireData.progress >= 50
                            ? THEME.gold
                            : THEME.accent,
                      borderRadius: 5,
                      transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 14,
                  }}
                >
                  {[
                    {
                      label: "FIRE Corpus Needed",
                      value: fmtINRFull(fireData.fireCorpus),
                      sub: `25 × annual spend`,
                      color: THEME.ink,
                    },
                    {
                      label: "Annual Spend",
                      value: fmtINRFull(fireData.annualExpense),
                      sub: `${fmtINR(metrics.monthExpense)}/mo`,
                      color: THEME.ink,
                    },
                    {
                      label: "Current Net Worth",
                      value: fmtINRFull(metrics.netWorth),
                      sub: "your wealth base",
                      color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust,
                    },
                    {
                      label: "Remaining to FIRE",
                      value:
                        fireData.fireCorpus > metrics.netWorth
                          ? fmtINRFull(fireData.fireCorpus - Math.max(metrics.netWorth, 0))
                          : "FI Achieved!",
                      sub:
                        fireData.fireCorpus > metrics.netWorth ? "gap to close" : "congratulations",
                      color: fireData.fireCorpus > metrics.netWorth ? THEME.rust : THEME.sage,
                    },
                  ].map(({ label, value, sub, color }) => (
                    <div
                      key={label}
                      style={{
                        padding: "14px 16px",
                        background: "rgba(128,128,128,0.04)",
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.muted,
                          fontWeight: 700,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.08em",
                          marginBottom: 6,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: "-0.01em" }}
                      >
                        {value}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div
                style={{ padding: "24px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}
              >
                Add monthly expenses to calculate your FIRE corpus target
              </div>
            )}

            {fireData.fireCorpus > 0 && (
              <div
                style={{
                  marginTop: 20,
                  padding: "16px 20px",
                  background: `${THEME.accent}0f`,
                  borderRadius: 12,
                  border: `1px solid ${THEME.accent}2e`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#818CF8",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.08em",
                    marginBottom: 12,
                  }}
                >
                  What-If: Extra Monthly Investment
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 180px" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: THEME.muted }}>₹</span>
                    <input
                      type="number"
                      value={fireWhatIfExtra || ""}
                      onChange={(e) => setFireWhatIfExtra(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="e.g. 10000"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1px solid ${THEME.accent}4d`,
                        background: "var(--surface-0)",
                        color: THEME.ink,
                        fontSize: 13,
                        outline: "none",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: THEME.muted,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      extra/month
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      width: "100%",
                      marginTop: 4,
                    }}
                  >
                    {[
                      { label: "+₹5k", val: 5000 },
                      { label: "+₹10k", val: 10000 },
                      { label: "+₹25k", val: 25000 },
                      { label: "Reset", val: 0 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setFireWhatIfExtra(preset.val)}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: `1px solid ${THEME.accent}3d`,
                          background:
                            fireWhatIfExtra === preset.val ? `${THEME.accent}24` : "transparent",
                          color: THEME.accent,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const currentSavings = Math.max(0, metrics.monthIncome - metrics.monthExpense);
                    const totalSavings = currentSavings + fireWhatIfExtra;
                    const gap = Math.max(0, fireData.fireCorpus - Math.max(metrics.netWorth, 0));
                    if (gap <= 0)
                      return (
                        <div style={{ fontSize: 12, color: THEME.sage, fontWeight: 700 }}>
                          FIRE already achieved!
                        </div>
                      );
                    if (totalSavings <= 0)
                      return (
                        <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                          Enter an amount above
                        </div>
                      );
                    const r = 0.12 / 12;
                    const months = Math.log(1 + (gap * r) / totalSavings) / Math.log(1 + r);
                    const years = months / 12;
                    const baseYrs =
                      currentSavings > 0
                        ? Math.log(1 + (gap * r) / currentSavings) / Math.log(1 + r) / 12
                        : null;
                    const saved = baseYrs !== null && isFinite(baseYrs) ? baseYrs - years : null;
                    return isFinite(years) && years > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 20,
                          padding: "10px 16px",
                          background: `${THEME.accent}15`,
                          borderRadius: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 26,
                              fontWeight: 900,
                              color: THEME.accent,
                              letterSpacing: "-0.03em",
                              lineHeight: 1,
                            }}
                          >
                            {years.toFixed(1)}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.muted,
                              fontWeight: 600,
                              textTransform: "uppercase" as const,
                            }}
                          >
                            years to FIRE
                          </div>
                        </div>
                        {saved !== null && isFinite(saved) && saved > 0.1 && (
                          <div style={{ fontSize: 12, color: THEME.sage, fontWeight: 700 }}>
                            {saved.toFixed(1)} yrs faster
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: THEME.muted }}>Calculating…</div>
                    );
                  })()}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 10 }}>
                  * Assumes 12% p.a. compounded returns
                </div>
              </div>
            )}
          </Card>

          {/* 10-Year Net Worth Projections & Financial Freedom Suite */}
          <Card style={{ padding: 24, marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>
                  10-Year Net Worth & Runway Projections
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Interactive CFO growth model & life event simulator
                </div>
              </div>
              {crossoverYear ? (
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: THEME.sage,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    🎯 {crossoverYear}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    FIRE Crossover Year
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.gold }}>
                    Increase SIPs to hit FIRE in 10y
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Pacing needed
                  </div>
                </div>
              )}
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr", gap: 28 }}
              className="bento-grid"
            >
              {/* Bento Row: Sliders (CFO Control Console) & Chart Display */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 24,
                }}
              >
                {/* Sliders Panel */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                    padding: "16px 20px",
                    background: "rgba(128,128,128,0.02)",
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: THEME.ink,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px dashed ${THEME.line}`,
                      paddingBottom: 8,
                      marginBottom: 4,
                    }}
                  >
                    Compounding Inputs
                  </div>

                  {/* Equities CAGR Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>Equities Return (CAGR)</span>
                      <span style={{ color: THEME.accent, fontWeight: 800 }}>{eqCAGR}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      step="0.5"
                      value={eqCAGR}
                      onChange={(e) => setEqCAGR(Number(e.target.value))}
                      className="cxo-slider"
                    />
                  </div>

                  {/* Fixed Income CAGR Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>Fixed Income Return</span>
                      <span style={{ color: THEME.sage, fontWeight: 800 }}>{fiCAGR}%</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      step="0.5"
                      value={fiCAGR}
                      onChange={(e) => setFiCAGR(Number(e.target.value))}
                      className="cxo-slider"
                    />
                  </div>

                  {/* Inflation Rate Slider */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>Expected Inflation</span>
                      <span style={{ color: THEME.rust, fontWeight: 800 }}>{inflationRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="12"
                      step="0.5"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Number(e.target.value))}
                      className="cxo-slider"
                    />
                  </div>

                  {/* Windfall / Milestone Events */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: THEME.ink,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px dashed ${THEME.line}`,
                      paddingBottom: 8,
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    Windfalls & Milestone Events
                  </div>

                  {/* One-time Windfall */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>One-time Windfall (₹)</span>
                      <span style={{ color: THEME.sage, fontWeight: 800 }}>
                        {windfallAmount > 0 ? fmtINR(windfallAmount) : "None"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="number"
                        placeholder="e.g. 1000000"
                        value={windfallAmount || ""}
                        onChange={(e) =>
                          setWindfallAmount(Math.max(0, Number(e.target.value) || 0))
                        }
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.line}`,
                          background: "var(--surface-0)",
                          color: THEME.ink,
                          fontSize: 12,
                          outline: "none",
                        }}
                      />
                      {windfallAmount > 0 && (
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                        >
                          <span style={{ fontSize: 11, color: THEME.muted }}>Year:</span>
                          <select
                            value={windfallYear}
                            onChange={(e) => setWindfallYear(Number(e.target.value))}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: `1px solid ${THEME.line}`,
                              fontSize: 12,
                              background: "var(--surface-0)",
                              color: THEME.ink,
                            }}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((yr) => (
                              <option key={yr} value={yr}>
                                Y{yr}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                      {[
                        { label: "+₹5L", val: 500000 },
                        { label: "+₹10L", val: 1000000 },
                        { label: "+₹25L", val: 2500000 },
                        { label: "Reset", val: 0 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setWindfallAmount(preset.val)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: `1px solid ${THEME.sage}33`,
                            background:
                              windfallAmount === preset.val ? `${THEME.sage}1a` : "transparent",
                            color: THEME.sage,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* One-time Major Expense */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>One-time Major Expense (₹)</span>
                      <span style={{ color: THEME.rust, fontWeight: 800 }}>
                        {extraExpenseAmount > 0 ? fmtINR(extraExpenseAmount) : "None"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="number"
                        placeholder="e.g. 1500000"
                        value={extraExpenseAmount || ""}
                        onChange={(e) =>
                          setExtraExpenseAmount(Math.max(0, Number(e.target.value) || 0))
                        }
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.line}`,
                          background: "var(--surface-0)",
                          color: THEME.ink,
                          fontSize: 12,
                          outline: "none",
                        }}
                      />
                      {extraExpenseAmount > 0 && (
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                        >
                          <span style={{ fontSize: 11, color: THEME.muted }}>Year:</span>
                          <select
                            value={extraExpenseYear}
                            onChange={(e) => setExtraExpenseYear(Number(e.target.value))}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: `1px solid ${THEME.line}`,
                              fontSize: 12,
                              background: "var(--surface-0)",
                              color: THEME.ink,
                            }}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((yr) => (
                              <option key={yr} value={yr}>
                                Y{yr}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                      {[
                        { label: "+₹1L", val: 100000 },
                        { label: "+₹5L", val: 500000 },
                        { label: "+₹10L", val: 1000000 },
                        { label: "Reset", val: 0 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setExtraExpenseAmount(preset.val)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: `1px solid ${THEME.rust}33`,
                            background:
                              extraExpenseAmount === preset.val ? `${THEME.rust}1a` : "transparent",
                            color: THEME.rust,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chart Visualization */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    height: 380,
                    flex: 1.5,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                      color: THEME.muted,
                      fontWeight: 600,
                      padding: "0 6px",
                    }}
                  >
                    <span>Projected Wealth Compounding Curve</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            background: THEME.accent,
                            borderRadius: 2,
                          }}
                        />{" "}
                        Nominal
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <div
                          style={{ width: 10, height: 10, background: THEME.sage, borderRadius: 2 }}
                        />{" "}
                        Real (Inflation Adj.)
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <div
                          style={{ width: 12, height: 1, borderTop: `2px dashed ${THEME.gold}` }}
                        />{" "}
                        FIRE Goal Post
                      </span>
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      width: "100%",
                      height: "100%",
                      background: "rgba(128,128,128,0.01)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 16,
                      padding: "16px 12px 6px",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={projectionData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="projColorNet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={THEME.accent} stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="projColorReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={THEME.sage} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={`${THEME.line}80`}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="year"
                          stroke={THEME.muted}
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke={THEME.muted}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            if (val >= 1e7) return `${(val / 1e7).toFixed(1)}Cr`;
                            if (val >= 1e5) return `${(val / 1e5).toFixed(0)}L`;
                            return `${val / 1000}K`;
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 12,
                            boxShadow: "var(--shadow-md)",
                            color: THEME.ink,
                            fontSize: 13,
                          }}
                          formatter={(value: any, name: string) => {
                            const labelMap: Record<string, string> = {
                              netWorth: "Nominal Net Worth",
                              realNetWorth: "Real (Inflation Adj.)",
                              fireTarget: "FIRE Goal Post",
                            };
                            return [fmtINRFull(Number(value)), labelMap[name] || name];
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="netWorth"
                          stroke={THEME.accent}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#projColorNet)"
                        />
                        <Area
                          type="monotone"
                          dataKey="realNetWorth"
                          stroke={THEME.sage}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#projColorReal)"
                        />
                        <Area
                          type="monotone"
                          dataKey="fireTarget"
                          stroke={THEME.gold}
                          strokeWidth={1.5}
                          strokeDasharray="5 5"
                          fill="none"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bottom Projection Runway Banner */}
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  padding: "16px 20px",
                  background: crossoverYear ? `${THEME.sage}0f` : `${THEME.gold}0f`,
                  border: `1px solid ${crossoverYear ? `${THEME.sage}2e` : `${THEME.gold}2e`}`,
                  borderRadius: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>{crossoverYear ? "🚀" : "💡"}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: crossoverYear ? THEME.sage : THEME.gold,
                      marginBottom: 2,
                    }}
                  >
                    {crossoverYear
                      ? `Financial Independence Projected for ${crossoverYear}!`
                      : "Runway Target Exceeds 10 Years"}
                  </div>
                  <div style={{ fontSize: 12.5, color: THEME.muted, lineHeight: 1.5 }}>
                    {crossoverYear
                      ? (() => {
                          const yrsAway = crossoverYear - new Date().getFullYear();
                          const timeStr =
                            yrsAway === 0
                              ? "this year"
                              : `in ${yrsAway} year${yrsAway === 1 ? "" : "s"}`;
                          return `With Equities compounding at ${eqCAGR}% and Fixed Income at ${fiCAGR}%, your wealth is projected to outpace your inflation-adjusted FIRE corpus requirement of ${fmtINR(projectionData[yrsAway]?.fireTarget || 0)} ${timeStr}. Adjust the monthly savings input above to accelerate this vector!`;
                        })()
                      : `At the current growth trajectory, inflation (${inflationRate}%) is challenging your real wealth growth vector. Consider increasing your monthly equity SIP investments or seeking higher-yielding asset classes to compound past your goal post within the decade.`}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 80C Tax Deduction */}
          <Card style={{ padding: 24, marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>
                  80C Tax Deduction Utilization
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>Annual ₹1.5L deduction limit</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: taxData80C.progress >= 100 ? THEME.sage : THEME.accent,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {taxData80C.progress.toFixed(0)}%
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: THEME.muted,
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                  }}
                >
                  used
                </div>
              </div>
            </div>
            <div
              style={{
                height: 8,
                background: THEME.line,
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: taxData80C.progress + "%",
                  background:
                    taxData80C.progress >= 100
                      ? THEME.sage
                      : taxData80C.progress >= 60
                        ? THEME.gold
                        : THEME.accent,
                  borderRadius: 4,
                  transition: "width 1s ease",
                }}
              />
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { label: "ELSS Invested", value: taxData80C.elss, color: THEME.accent },
                { label: "PPF Contribution", value: taxData80C.ppfAnnual, color: THEME.sage },
                { label: "LIC Premium", value: taxData80C.licPremium, color: THEME.gold },
                ...(taxData80C.epfEmployee > 0
                  ? [{ label: "EPF (Employee)", value: taxData80C.epfEmployee, color: "#38bdf8" }]
                  : []),
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                    <span style={{ color: THEME.muted, fontWeight: 500 }}>{label}</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{fmtINRFull(value)}</span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 12,
                  borderTop: `1px solid ${THEME.line}`,
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 700 }}>Remaining Space</span>
                <span
                  style={{
                    fontWeight: 800,
                    color: taxData80C.remaining > 0 ? THEME.rust : THEME.sage,
                  }}
                >
                  {fmtINRFull(taxData80C.remaining)}
                </span>
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>
            {/* Savings Goal & Pacing */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div
                className="section-label"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>Savings Goal & Pacing</span>
                {editingTarget ? (
                  <input
                    type="number"
                    autoFocus
                    defaultValue={
                      state.masterData?._savingsTarget ?? state.profile?.savingsTarget ?? 20
                    }
                    onBlur={(e) => {
                      const val = e.target.value;
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 0 && num <= 100) {
                        // Persist via masterData so it survives DB reloads (profile overwrite)
                        if (updateMasterData) updateMasterData("_savingsTarget", num);
                        setState((prev: any) => ({
                          ...prev,
                          profile: { ...prev.profile, savingsTarget: num },
                        }));
                      }
                      setEditingTarget(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setEditingTarget(false);
                    }}
                    style={{
                      width: 60,
                      background: `${THEME.sage}1a`,
                      border: `1px solid ${THEME.sage}`,
                      borderRadius: 6,
                      color: THEME.sage,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "2px 6px",
                      outline: "none",
                      textAlign: "center",
                    }}
                  />
                ) : (
                  <Badge
                    variant="sage"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTarget(true);
                    }}
                  >
                    Target: {state.masterData?._savingsTarget ?? state.profile?.savingsTarget ?? 20}
                    %
                  </Badge>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 20,
                }}
              >
                {(() => {
                  const income = metrics.monthIncome || 0;
                  const spent = metrics.monthExpense || 0;
                  const targetPct =
                    state.masterData?._savingsTarget ?? state.profile?.savingsTarget ?? 20;
                  const savingsTarget = income * (targetPct / 100);
                  const safeSpendLimit = income * ((100 - targetPct) / 100);
                  const remainingSafe = safeSpendLimit - spent;
                  const spendingPct = income > 0 ? (spent / income) * 100 : 0;
                  const isOverBudget = spent > safeSpendLimit;

                  // Calculate remaining days in month for daily actionable
                  const now = new Date();
                  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                  const daysLeft = Math.max(1, lastDay - now.getDate());
                  const dailyBudget = remainingSafe > 0 ? remainingSafe / daysLeft : 0;

                  return (
                    <>
                      <div style={{ textAlign: "center", marginBottom: 10 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: THEME.muted,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            marginBottom: 8,
                          }}
                        >
                          {remainingSafe > 0 ? "Safe to Spend" : "Savings Alert"}
                        </div>
                        <div
                          style={{
                            fontSize: 32,
                            fontWeight: 900,
                            color: remainingSafe > 0 ? THEME.sage : THEME.rust,
                            letterSpacing: "-0.03em",
                          }}
                        >
                          {fmtINRFull(Math.abs(remainingSafe))}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                          {remainingSafe > 0
                            ? `Keep daily spend below ${fmtINR(dailyBudget)} to hit your ${targetPct}% goal`
                            : `You've exceeded your safety limit by ${fmtINR(Math.abs(remainingSafe))}`}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 12,
                          marginBottom: 10,
                          padding: "12px 0",
                          borderTop: `1px solid ${THEME.line}`,
                          borderBottom: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.muted,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 4,
                              letterSpacing: "0.05em",
                            }}
                          >
                            Income
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                            {fmtINRFull(income)}
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.muted,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 4,
                              letterSpacing: "0.05em",
                            }}
                          >
                            Spent
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>
                            {fmtINRFull(spent)}
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: THEME.muted,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 4,
                              letterSpacing: "0.05em",
                            }}
                          >
                            To Save
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                            {fmtINRFull(savingsTarget)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          position: "relative",
                          height: 12,
                          background: THEME.line,
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        {/* Safe Zone Marker */}
                        <div
                          style={{
                            position: "absolute",
                            left: `${100 - targetPct}%`,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: THEME.accent,
                            zIndex: 2,
                            opacity: 0.5,
                          }}
                        />

                        {/* Actual Spending Fill */}
                        <div
                          style={{
                            width: `${Math.min(100, spendingPct)}%`,
                            height: "100%",
                            background: isOverBudget
                              ? THEME.rust
                              : spendingPct > 95
                                ? "#F97316"
                                : spendingPct > (100 - targetPct) * 0.8
                                  ? THEME.gold
                                  : spendingPct > 50
                                    ? "#A3E635"
                                    : THEME.sage,
                            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          fontWeight: 700,
                          color: THEME.muted,
                        }}
                      >
                        <span>SPENT: {spendingPct.toFixed(0)}%</span>
                        <span>GOAL: {targetPct}% SAVED</span>
                      </div>

                      <div
                        style={{
                          padding: "12px",
                          borderRadius: 12,
                          background: isOverBudget ? `${THEME.rust}09` : `${THEME.sage}09`,
                          border: `1px solid ${isOverBudget ? `${THEME.rust}1a` : `${THEME.sage}1a`}`,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: isOverBudget ? THEME.rust : THEME.sage,
                          fontWeight: 500,
                        }}
                      >
                        {isOverBudget
                          ? "⚠️ Your spending has eaten into your savings target. Consider deferring non-essential purchases."
                          : "✨ You're pacing well! Staying disciplined now will help you reach your financial milestones faster."}
                      </div>
                    </>
                  );
                })()}
              </div>
            </Card>

            {/* Goal Health Check */}
            <Card style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div className="section-label" style={{ marginBottom: 2 }}>
                    Goal Health Check
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    Monthly savings pace vs what each goal needs
                  </div>
                </div>
              </div>
              {goalHealth.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 0",
                    color: THEME.muted,
                    fontSize: 13,
                  }}
                >
                  Add goals in the Goals tab to see your progress and pacing here
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {goalHealth.map((g: any) => (
                    <div
                      key={g.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "rgba(128,128,128,0.04)",
                        border: `1px solid ${g.achieved ? "rgba(52,211,153,0.2)" : g.onTrack || !g.targetDate ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.2)"}`,
                      }}
                    >
                      {g.achieved || g.onTrack ? (
                        <CheckCircle2 size={18} color={THEME.sage} style={{ flexShrink: 0 }} />
                      ) : !g.targetDate ? (
                        <Target size={18} color={THEME.muted} style={{ flexShrink: 0 }} />
                      ) : (
                        <XCircle size={18} color={THEME.rust} style={{ flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                            flexWrap: "wrap",
                            gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{g.name || g.title}</span>
                          <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                            {g.achieved
                              ? "✓ Achieved"
                              : g.monthsLeft > 0
                                ? `${g.monthsLeft}mo left`
                                : g.targetDate
                                  ? "Overdue"
                                  : "No deadline"}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: THEME.line,
                            borderRadius: 3,
                            overflow: "hidden",
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: g.progress + "%",
                              background: g.achieved
                                ? THEME.sage
                                : g.onTrack
                                  ? THEME.accent
                                  : THEME.gold,
                              borderRadius: 3,
                              transition: "width 1s ease",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: THEME.muted,
                            flexWrap: "wrap",
                            gap: 4,
                          }}
                        >
                          <span>
                            {fmtINRFull(g.savedAmount)} of {fmtINRFull(g.targetAmount)}
                          </span>
                          {!g.achieved && g.monthsLeft > 0 && (
                            <span
                              style={{
                                color: g.onTrack ? THEME.sage : THEME.rust,
                                fontWeight: 700,
                              }}
                            >
                              Need {fmtINR(g.monthlyNeeded)}/mo ·{" "}
                              {g.onTrack ? "On track ✓" : "Behind ✗"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Tax Loss Harvesting */}
          {(() => {
            const todayD = new Date();
            const todayMs = todayD.getTime();
            const fyEndYear =
              todayD.getMonth() >= 3 ? todayD.getFullYear() + 1 : todayD.getFullYear();
            const fyEnd = new Date(fyEndYear, 2, 31);
            const daysToFYEnd = Math.ceil((fyEnd.getTime() - todayMs) / 86400000);
            const isNearFYEnd = daysToFYEnd >= 0 && daysToFYEnd <= 60;

            const losingStocks = (state.stocks || []).reduce((acc: any[], s: any) => {
              const base = (s.symbol || "")
                .replace(/\.NS$|\.BO$/, "")
                .replace(/-EQ$/, "")
                .toUpperCase();
              const exch = s.exchange || "NSE";
              const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
              const md = marketData?.[yfSym];
              const currentPrice = md?.price ?? Number(s.currentPrice || 0);
              const avgPrice = Number(s.avgPrice || 0);
              if (!currentPrice || !avgPrice || currentPrice >= avgPrice) return acc;
              const qty = Number(s.qty || 0);
              const loss = (avgPrice - currentPrice) * qty;
              const lossPct = ((avgPrice - currentPrice) / avgPrice) * 100;
              const buyDate = s.buyDate ? new Date(s.buyDate) : null;
              const daysHeld = buyDate
                ? Math.floor((todayMs - buyDate.getTime()) / 86400000)
                : null;
              const isSTCG = daysHeld === null || daysHeld < 365;
              acc.push({ name: base, type: "Stock", loss, lossPct, isSTCG });
              return acc;
            }, []);

            const losingMFs = (state.mutualFunds || []).reduce((acc: any[], m: any) => {
              const currentNav = Number(m.currentNav || 0);
              const buyNav =
                Number(m.buyNav || 0) ||
                (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
              if (!currentNav || !buyNav || currentNav >= buyNav) return acc;
              const units = Number(m.units || 0);
              const loss = (buyNav - currentNav) * units;
              const lossPct = ((buyNav - currentNav) / buyNav) * 100;
              const buyDate = m.buyDate ? new Date(m.buyDate) : null;
              const daysHeld = buyDate
                ? Math.floor((todayMs - buyDate.getTime()) / 86400000)
                : null;
              const isSTCG = daysHeld === null || daysHeld < 365;
              const name = (m.scheme || m.fund || "Mutual Fund").substring(0, 28);
              acc.push({ name, type: "MF", loss, lossPct, isSTCG });
              return acc;
            }, []);

            const allLosses = [...losingStocks, ...losingMFs].sort((a, b) => b.loss - a.loss);

            return (
              <Card style={{ padding: 24, marginTop: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div className="section-label" style={{ marginBottom: 2 }}>
                      Tax Loss Harvesting Simulator
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted }}>
                      Select loss positions to offset capital gains in real-time
                    </div>
                  </div>
                  {isNearFYEnd && (
                    <Badge variant="rust" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={10} />
                      {daysToFYEnd}d to Mar 31
                    </Badge>
                  )}
                </div>

                {allLosses.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 0",
                      color: THEME.muted,
                      fontSize: 13,
                      background: `${THEME.sage}08`,
                      borderRadius: 12,
                    }}
                  >
                    All holdings currently in profit — no harvesting opportunities
                  </div>
                ) : (
                  <>
                    {(() => {
                      const activeSelections = { ...harvestedSelections };
                      allLosses.forEach((x, idx) => {
                        const key = `${x.type}_${x.name}_${idx}`;
                        if (activeSelections[key] === undefined) {
                          activeSelections[key] = true;
                        }
                      });

                      const selectedLosses = allLosses.filter(
                        (x, idx) => activeSelections[`${x.type}_${x.name}_${idx}`]
                      );
                      const selectedTotalLoss = selectedLosses.reduce((s, x) => s + x.loss, 0);
                      const selectedStcgLoss = selectedLosses
                        .filter((x) => x.isSTCG)
                        .reduce((s, x) => s + x.loss, 0);
                      const selectedLtcgLoss = selectedLosses
                        .filter((x) => !x.isSTCG)
                        .reduce((s, x) => s + x.loss, 0);
                      const selectedEstSavings = selectedStcgLoss * 0.2 + selectedLtcgLoss * 0.125;
                      const selectedCount = selectedLosses.length;

                      return (
                        <>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
                              gap: 12,
                              padding: 16,
                              background: `${THEME.rust}09`,
                              borderRadius: 12,
                              border: `1px solid ${THEME.rust}1a`,
                              marginBottom: 20,
                            }}
                          >
                            {[
                              {
                                label: "Harvested Loss",
                                value: fmtINR(selectedTotalLoss),
                                color: THEME.rust,
                              },
                              {
                                label: "Est. Tax Saving",
                                value: fmtINR(selectedEstSavings),
                                color: THEME.sage,
                              },
                              {
                                label: "Selected",
                                value: `${selectedCount} / ${allLosses.length}`,
                                color: THEME.ink,
                              },
                            ].map(({ label, value, color }) => (
                              <div key={label} style={{ textAlign: "center" }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: THEME.muted,
                                    fontWeight: 700,
                                    textTransform: "uppercase" as const,
                                    letterSpacing: "0.05em",
                                    marginBottom: 4,
                                  }}
                                >
                                  {label}
                                </div>
                                <div
                                  style={{
                                    fontSize: 18,
                                    fontWeight: 900,
                                    color,
                                    letterSpacing: "-0.02em",
                                  }}
                                >
                                  {value}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "grid", gap: 10 }}>
                            {allLosses.slice(0, 6).map((item, i) => {
                              const itemKey = `${item.type}_${item.name}_${i}`;
                              const isChecked = activeSelections[itemKey] !== false;
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    background: isChecked
                                      ? "rgba(128,128,128,0.03)"
                                      : "rgba(128,128,128,0.01)",
                                    border: `1px solid ${isChecked ? THEME.line : "rgba(128,128,128,0.08)"}`,
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setHarvestedSelections((prev) => ({
                                        ...prev,
                                        [itemKey]: !isChecked,
                                      }));
                                    }}
                                    style={{
                                      width: 15,
                                      height: 15,
                                      cursor: "pointer",
                                      accentColor: THEME.accent,
                                    }}
                                  />
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 10,
                                      background: isChecked
                                        ? "rgba(239,68,68,0.08)"
                                        : "rgba(128,128,128,0.06)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                      opacity: isChecked ? 1 : 0.4,
                                    }}
                                  >
                                    {item.type === "Stock" ? (
                                      <TrendingUp
                                        size={16}
                                        color={isChecked ? THEME.rust : THEME.muted}
                                      />
                                    ) : (
                                      <Activity
                                        size={16}
                                        color={isChecked ? THEME.rust : THEME.muted}
                                      />
                                    )}
                                  </div>
                                  <div
                                    style={{ flex: 1, minWidth: 0, opacity: isChecked ? 1 : 0.45 }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 700,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap" as const,
                                        }}
                                      >
                                        {item.name}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 800,
                                          color: THEME.rust,
                                          flexShrink: 0,
                                          marginLeft: 8,
                                        }}
                                      >
                                        −{fmtINR(item.loss)}
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginTop: 3,
                                        fontSize: 11,
                                        color: THEME.muted,
                                      }}
                                    >
                                      <span>
                                        {item.type} · {item.isSTCG ? "STCG 20%" : "LTCG 12.5%"}
                                      </span>
                                      <span style={{ color: THEME.rust, fontWeight: 600 }}>
                                        ↓ {item.lossPct.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}

                    {allLosses.length > 6 && (
                      <div
                        style={{
                          textAlign: "center",
                          marginTop: 10,
                          fontSize: 12,
                          color: THEME.muted,
                        }}
                      >
                        +{allLosses.length - 6} more positions in loss
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 16,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "rgba(128,128,128,0.04)",
                        borderTop: `1px solid ${THEME.line}`,
                        fontSize: 11,
                        color: THEME.muted,
                        lineHeight: 1.6,
                      }}
                    >
                      * STCG 20% · LTCG 12.5% (Budget 2024 rates). Offsetting checks simulate real
                      tax loss harvesting options. Re-buy after 30+ days to avoid wash-sale issues.
                      Consult your CA.
                    </div>
                  </>
                )}
              </Card>
            );
          })()}

          {/* SIP vs Lump Sum Goal Planner */}
          {(() => {
            const r = sipLsCagr > 0 ? sipLsCagr / 100 / 12 : 0;
            const n = sipLsYears * 12;
            const FV = sipLsTarget;
            const sipNeeded =
              FV > 0 && r > 0 && n > 0 ? (FV * r) / ((Math.pow(1 + r, n) - 1) * (1 + r)) : 0;
            const lumpNeeded =
              FV > 0 && sipLsCagr > 0 ? FV / Math.pow(1 + sipLsCagr / 100, sipLsYears) : 0;
            const sipTotal = sipNeeded * n;
            const lumpGrowth = FV > 0 ? FV - lumpNeeded : 0;
            return (
              <Card style={{ padding: 24, marginTop: 28, marginBottom: 28 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div className="section-label">SIP vs Lump Sum — Goal Planner</div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    How much do you need to invest to reach a target corpus?
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                    marginBottom: 24,
                    marginTop: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      Target Corpus (₹)
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="100000"
                      value={sipLsTarget || ""}
                      onChange={(e) => setSipLsTarget(Math.max(0, Number(e.target.value) || 0))}
                      placeholder={`e.g. ${fmtINR(5000000)}`}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1.5px solid ${THEME.line}`,
                        background: "var(--surface-0)",
                        color: THEME.ink,
                        fontSize: 14,
                        fontWeight: 700,
                        outline: "none",
                        boxSizing: "border-box" as const,
                      }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {[500000, 1000000, 2500000, 5000000].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setSipLsTarget(preset)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: `1px solid ${THEME.line}`,
                            background:
                              sipLsTarget === preset ? `${THEME.accent}1f` : "transparent",
                            color: sipLsTarget === preset ? THEME.accent : THEME.muted,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {fmtINR(preset)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      Timeline — {sipLsYears} Year{sipLsYears > 1 ? "s" : ""}
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={sipLsYears}
                      onChange={(e) => setSipLsYears(Number(e.target.value))}
                      style={{ width: "100%", accentColor: THEME.accent }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: THEME.muted,
                        marginTop: 2,
                      }}
                    >
                      <span>1y</span>
                      <span>15y</span>
                      <span>30y</span>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      Expected CAGR — {sipLsCagr}%
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="20"
                      step="0.5"
                      value={sipLsCagr}
                      onChange={(e) => setSipLsCagr(Number(e.target.value))}
                      style={{ width: "100%", accentColor: THEME.accent }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: THEME.muted,
                        marginTop: 2,
                      }}
                    >
                      <span>4%</span>
                      <span>12%</span>
                      <span>20%</span>
                    </div>
                  </div>
                </div>

                {FV > 0 && sipNeeded > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div
                      style={{
                        padding: "20px 24px",
                        borderRadius: 14,
                        background: `${THEME.accent}0f`,
                        border: `1.5px solid ${THEME.accent}40`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.accent,
                          fontWeight: 800,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.1em",
                          marginBottom: 8,
                        }}
                      >
                        Monthly SIP Needed
                      </div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 900,
                          color: THEME.accent,
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                        }}
                      >
                        {fmtINRFull(Math.round(sipNeeded))}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8 }}>
                        Total invested: {fmtINRFull(Math.round(sipTotal))}
                      </div>
                      <div
                        style={{ fontSize: 12, color: THEME.sage, marginTop: 4, fontWeight: 600 }}
                      >
                        Gains: {fmtINRFull(Math.round(FV - sipTotal))}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "20px 24px",
                        borderRadius: 14,
                        background: "rgba(128,128,128,0.04)",
                        border: `1.5px solid ${THEME.line}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.muted,
                          fontWeight: 800,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.1em",
                          marginBottom: 8,
                        }}
                      >
                        Lump Sum Today
                      </div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 900,
                          color: THEME.ink,
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                        }}
                      >
                        {fmtINRFull(Math.round(lumpNeeded))}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8 }}>
                        Grows to {fmtINRFull(FV)} in {sipLsYears}y
                      </div>
                      <div
                        style={{ fontSize: 12, color: THEME.sage, marginTop: 4, fontWeight: 600 }}
                      >
                        Gains: {fmtINRFull(Math.round(lumpGrowth))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "24px 0",
                      textAlign: "center",
                      color: THEME.muted,
                      fontSize: 13,
                    }}
                  >
                    Enter a target corpus above to calculate required SIP and lump sum amounts
                  </div>
                )}

                <div style={{ marginTop: 14, fontSize: 11, color: THEME.muted }}>
                  * SIP formula assumes monthly contributions at {sipLsCagr}% p.a. CAGR, beginning
                  of period. Returns not guaranteed.
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* ────────────────── SUB-TAB: SPENDING ────────────────── */}
      {sub === "spending" &&
        (() => {
          const now = new Date();
          const currYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const isCurrentMonth = spendingViewMonth >= currYm;
          const [svy, svm] = spendingViewMonth.split("-").map(Number);
          const spendMonthLabel = new Date(svy, svm - 1, 1).toLocaleString("en-IN", {
            month: "long",
            year: "numeric",
          });
          const prevMonthDate = new Date(svy, svm - 2, 1);
          const prevMonthLabel = prevMonthDate.toLocaleString("en-IN", { month: "long" });
          const navToMonth = (offset: number) => {
            const next = new Date(svy, svm - 1 + offset, 1);
            setSpendingViewMonth(
              `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
            );
            setSelectedExpenseCategory(null);
            setActiveExpenseIndex(null);
          };
          return (
            <div key="spending" className="tab-content-enter">
              {/* Month navigation bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(128,128,128,0.04)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => navToMonth(-1)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      cursor: "pointer",
                      color: THEME.ink,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      setSpendingViewMonth(
                        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
                      );
                      setSelectedExpenseCategory(null);
                      setActiveExpenseIndex(null);
                    }}
                    disabled={isCurrentMonth}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      cursor: isCurrentMonth ? "default" : "pointer",
                      color: isCurrentMonth ? THEME.muted : THEME.ink,
                      opacity: isCurrentMonth ? 0.4 : 1,
                    }}
                  >
                    Today
                  </button>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {spendMonthLabel}
                  </div>
                  {spendingData.total > 0 && (
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Total spent: {fmtINRFull(spendingData.total)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navToMonth(1)}
                  disabled={isCurrentMonth}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${THEME.line}`,
                    background: "transparent",
                    cursor: isCurrentMonth ? "default" : "pointer",
                    color: isCurrentMonth ? THEME.muted : THEME.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isCurrentMonth ? 0.35 : 1,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
                <Card style={{ padding: 24, display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div className="section-label" style={{ marginBottom: 2 }}>
                        Expense Breakup
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        {selectedExpenseCategory
                          ? `Drill down: ${selectedExpenseCategory}`
                          : "Interactive monthly spending map"}
                      </div>
                    </div>
                    {selectedExpenseCategory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedExpenseCategory(null);
                          setActiveExpenseIndex(null);
                        }}
                        style={{
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 8px",
                        }}
                      >
                        <ChevronLeft size={14} /> Back
                      </Button>
                    )}
                  </div>
                  {spendingData.breakdown?.length === 0 ? (
                    <div
                      style={{
                        height: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: THEME.muted,
                        fontSize: 13,
                        background: "rgba(128,128,128,0.03)",
                        borderRadius: 12,
                        textAlign: "center",
                        padding: 24,
                      }}
                    >
                      No expenses recorded for {spendMonthLabel}. Add debit transactions to see your
                      spending breakup.
                    </div>
                  ) : (
                    <div
                      className="allocation-interactive-container"
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 24,
                        minHeight: 300,
                      }}
                    >
                      {/* Left Side: Donut Chart with central display */}
                      <div
                        style={{
                          flex: "1 1 240px",
                          position: "relative",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={spendingData.breakdown}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={72}
                              outerRadius={92}
                              paddingAngle={2}
                              onMouseEnter={(_, index) => setActiveExpenseIndex(index)}
                              onMouseLeave={() => setActiveExpenseIndex(null)}
                              onClick={(_, index) => {
                                const selectedName = spendingData.breakdown[index]?.name;
                                setSelectedExpenseCategory(
                                  selectedName === selectedExpenseCategory ? null : selectedName
                                );
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              {spendingData.breakdown.map((item: any, i: number) => {
                                const isSelected = selectedExpenseCategory === item.name;
                                const isHovered = activeExpenseIndex === i;
                                return (
                                  <Cell
                                    key={i}
                                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                                    opacity={
                                      selectedExpenseCategory
                                        ? isSelected
                                          ? 1
                                          : 0.4
                                        : activeExpenseIndex !== null
                                          ? isHovered
                                            ? 1
                                            : 0.6
                                          : 1
                                    }
                                    style={{
                                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                      transform:
                                        isHovered || isSelected ? "scale(1.03)" : "scale(1)",
                                      transformOrigin: "center",
                                    }}
                                  />
                                );
                              })}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>

                        {/* Central display inside the donut hole */}
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            textAlign: "center",
                            pointerEvents: "none",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            width: 130,
                            zIndex: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              marginBottom: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              width: "100%",
                            }}
                          >
                            {activeExpenseIndex !== null
                              ? spendingData.breakdown[activeExpenseIndex]?.name
                              : selectedExpenseCategory
                                ? selectedExpenseCategory
                                : "Total Spend"}
                          </span>
                          <span
                            style={{
                              fontSize: 17,
                              fontWeight: 900,
                              color: THEME.ink,
                              letterSpacing: "-0.02em",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              width: "100%",
                            }}
                          >
                            {fmtINRFull(
                              activeExpenseIndex !== null
                                ? spendingData.breakdown[activeExpenseIndex]?.value
                                : selectedExpenseCategory
                                  ? spendingData.breakdown.find(
                                      (x: any) => x.name === selectedExpenseCategory
                                    )?.value || 0
                                  : spendingData.total
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: THEME.sage,
                              marginTop: 2,
                            }}
                          >
                            {(() => {
                              const val =
                                activeExpenseIndex !== null
                                  ? spendingData.breakdown[activeExpenseIndex]?.value
                                  : selectedExpenseCategory
                                    ? spendingData.breakdown.find(
                                        (x: any) => x.name === selectedExpenseCategory
                                      )?.value || 0
                                    : spendingData.total;
                              const total = spendingData.total || 1;
                              return `${((val / total) * 100).toFixed(1)}%`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Interactive detail list and sub-asset drill-down */}
                      <div
                        style={{
                          flex: "1 1 240px",
                          maxHeight: 260,
                          overflowY: "auto",
                          paddingRight: 4,
                        }}
                      >
                        {selectedExpenseCategory ? (
                          // DRILL DOWN TRANSACTION LIST FOR SELECTED CATEGORY
                          <div style={{ display: "grid", gap: 10 }}>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: THEME.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                display: "flex",
                                justifyContent: "space-between",
                                borderBottom: `1px solid ${THEME.line}`,
                                paddingBottom: 6,
                              }}
                            >
                              <span>Transaction Details</span>
                              <span>Amount</span>
                            </div>
                            {(() => {
                              const subList = getExpenseAssets(selectedExpenseCategory);
                              if (subList.length === 0) {
                                return (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: THEME.muted,
                                      padding: "12px 0",
                                      textAlign: "center",
                                    }}
                                  >
                                    No transactions for {spendMonthLabel}
                                  </div>
                                );
                              }
                              return subList.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: "rgba(128,128,128,0.03)",
                                    border: `1px solid ${THEME.line}`,
                                  }}
                                >
                                  <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                                    <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: THEME.ink,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {item.name}
                                    </div>
                                    {item.sub && (
                                      <div
                                        style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}
                                      >
                                        {item.sub}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                                    {fmtINR(item.value)}
                                  </span>
                                </div>
                              ));
                            })()}
                          </div>
                        ) : (
                          // OVERALL EXPENSE CATEGORY ALLOCATION LIST
                          <div style={{ display: "grid", gap: 8 }}>
                            {spendingData.breakdown.map((item: any, i: number) => {
                              const isHovered = activeExpenseIndex === i;
                              const color = PIE_COLORS[i % PIE_COLORS.length];
                              const pct = ((item.value / (spendingData.total || 1)) * 100).toFixed(
                                1
                              );
                              return (
                                <div
                                  key={i}
                                  onMouseEnter={() => setActiveExpenseIndex(i)}
                                  onMouseLeave={() => setActiveExpenseIndex(null)}
                                  onClick={() => setSelectedExpenseCategory(item.name)}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: isHovered
                                      ? "rgba(128,128,128,0.05)"
                                      : "rgba(128,128,128,0.02)",
                                    border: isHovered
                                      ? `1px solid ${color}`
                                      : `1px solid ${THEME.line}`,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      minWidth: 0,
                                      flex: 1,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: color,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: THEME.ink,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {item.name}
                                    </span>
                                    <span
                                      style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}
                                    >
                                      {pct}%
                                    </span>
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 800,
                                      color: THEME.ink,
                                      marginLeft: 8,
                                    }}
                                  >
                                    {fmtINR(item.value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                <Card style={{ padding: 24 }}>
                  <div className="section-label">Top Expenses</div>
                  {spendingData.breakdown?.length === 0 ? (
                    <div
                      style={{
                        height: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: THEME.muted,
                        fontSize: 13,
                        background: "rgba(128,128,128,0.03)",
                        borderRadius: 12,
                        textAlign: "center",
                        padding: 24,
                      }}
                    >
                      No spending details available
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 16 }}>
                      {spendingData.breakdown.slice(0, 5).map((cat: any, i: number) => {
                        const maxVal = spendingData.breakdown[0].value;
                        const pct = maxVal > 0 ? (cat.value / maxVal) * 100 : 0;
                        return (
                          <div key={cat.name}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 6,
                              }}
                            >
                              <span style={{ fontSize: 14, fontWeight: 700 }}>{cat.name}</span>
                              <span style={{ fontSize: 14, fontWeight: 800 }}>
                                {fmtINRFull(cat.value)}
                              </span>
                            </div>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{
                                  width: pct + "%",
                                  background: PIE_COLORS[i % PIE_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* MoM Category Comparison */}
              {spendingData.breakdown?.length > 0 && (
                <Card style={{ padding: 24, marginTop: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div className="section-label" style={{ marginBottom: 4 }}>
                        Category vs {prevMonthLabel}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        How your spending shifted compared to the previous month
                      </div>
                    </div>
                    <Badge variant="muted">Month-over-month</Badge>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {spendingData.breakdown.slice(0, 7).map((cat: any) => {
                      const prevVal = spendingPrevData[cat.name] || 0;
                      const delta = cat.value - prevVal;
                      const deltaPct = prevVal > 0 ? (delta / prevVal) * 100 : null;
                      const isUp = delta > 0;
                      const isNew = prevVal === 0 && cat.value > 0;
                      return (
                        <div
                          key={cat.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: "rgba(128,128,128,0.03)",
                            border: `1px solid ${THEME.line}`,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{cat.name}</span>
                              <span style={{ fontSize: 14, fontWeight: 800 }}>
                                {fmtINR(cat.value)}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 11,
                                color: THEME.muted,
                              }}
                            >
                              <span>
                                {prevMonthLabel}: {prevVal > 0 ? fmtINR(prevVal) : "—"}
                              </span>
                              {isNew ? (
                                <span style={{ color: THEME.gold, fontWeight: 700 }}>
                                  New this month
                                </span>
                              ) : delta !== 0 ? (
                                <span
                                  style={{ color: isUp ? THEME.rust : THEME.sage, fontWeight: 700 }}
                                >
                                  {isUp ? "▲" : "▼"} {fmtINR(Math.abs(delta))}
                                  {deltaPct !== null ? ` (${Math.abs(deltaPct).toFixed(0)}%)` : ""}
                                </span>
                              ) : (
                                <span style={{ color: THEME.sage, fontWeight: 600 }}>
                                  → No change
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          );
        })()}

      {/* ────────────────── SUB-TAB: CALENDAR ────────────────── */}
      {sub === "calendar" && (
        <div key="calendar" className="tab-content-enter">
          <Card style={{ padding: 24, marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div className="section-label" style={{ marginBottom: 0 }}>
                Bill Calendar ·{" "}
                {calendarDate.toLocaleString("en-IN", { month: "long", year: "numeric" })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCalendarDate(
                      new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
                    );
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    padding: 0,
                  }}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCalendarDate(new Date());
                  }}
                  style={{ fontSize: 11, fontWeight: 700, height: 32 }}
                >
                  Today
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCalendarDate(
                      new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
                    );
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    padding: 0,
                  }}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            {(() => {
              const now = new Date();
              const year = calendarDate.getFullYear(),
                month = calendarDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();

              // Only highlight today if the viewed month and year match today's real date
              const today2 =
                now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null;

              const dueDays: Record<number, any[]> = {};

              // 1. CREDIT CARDS: recurring or one-off dues (excluding closed cards)
              (state.creditCards || [])
                .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
                .forEach((c: any) => {
                  if (c.dueDate) {
                    const d = new Date(c.dueDate);
                    if (d.getFullYear() === year && d.getMonth() === month) {
                      dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({
                        label: c.issuer || "Card",
                        color: THEME.rust,
                      });
                    }
                  } else if (c.dueDay) {
                    const day = parseInt(c.dueDay, 10);
                    if (!isNaN(day) && day >= 1 && day <= 31) {
                      const targetDay = Math.min(day, daysInMonth);
                      dueDays[targetDay] = (dueDays[targetDay] || []).concat({
                        label: (c.issuer || "Card") + " Bill",
                        color: THEME.rust,
                      });
                    }
                  }
                });

              // 1b. CREDIT CARD ANNUAL FEES: mark the fee month/day in amber
              (state.creditCards || [])
                .filter(
                  (c: any) =>
                    (c.status || "").toLowerCase() !== "closed" &&
                    Number(c.annualFee) > 0 &&
                    c.feeMonth
                )
                .forEach((c: any) => {
                  if (Number(c.feeMonth) - 1 === month) {
                    const fDay = Math.min(Number(c.feeDay) || 1, daysInMonth);
                    dueDays[fDay] = (dueDays[fDay] || []).concat({
                      label: (c.issuer || "Card") + " Annual Fee",
                      color: "#fbbf24",
                    });
                  }
                });

              // 2. SUBSCRIPTIONS: recurrent logic by cycle
              (state.subscriptions || [])
                .filter((s: any) => !s.paused)
                .forEach((s: any) => {
                  if (s.renewalDate) {
                    const subDate = new Date(s.renewalDate);
                    const subDay = subDate.getDate();

                    let isDueThisMonth = false;
                    if (s.billingCycle === "monthly") {
                      isDueThisMonth = true;
                    } else if (s.billingCycle === "quarterly") {
                      const diffMonths =
                        (year - subDate.getFullYear()) * 12 + (month - subDate.getMonth());
                      isDueThisMonth = diffMonths >= 0 && diffMonths % 3 === 0;
                    } else if (s.billingCycle === "yearly") {
                      const diffMonths =
                        (year - subDate.getFullYear()) * 12 + (month - subDate.getMonth());
                      isDueThisMonth = diffMonths >= 0 && diffMonths % 12 === 0;
                    } else {
                      isDueThisMonth =
                        subDate.getFullYear() === year && subDate.getMonth() === month;
                    }

                    if (isDueThisMonth) {
                      const targetDay = Math.min(subDay, daysInMonth);
                      dueDays[targetDay] = (dueDays[targetDay] || []).concat({
                        label: s.name,
                        color: THEME.gold,
                      });
                    }
                  }
                });

              // 3. ADVANCE TAX (dynamic based on month number)
              [15].forEach((day) => {
                if (month === 5)
                  dueDays[day] = (dueDays[day] || []).concat({
                    label: "Adv. Tax",
                    color: THEME.accent,
                  });
              });
              if (month === 8 || month === 11 || month === 2)
                dueDays[15] = (dueDays[15] || []).concat({
                  label: "Adv. Tax",
                  color: THEME.accent,
                });

              // 4. LIC PREMIUMS: recurring logic by anniversary month and active range
              (state.lic || []).forEach((l: any) => {
                if (l.commencementDate) {
                  const commDate = new Date(l.commencementDate);
                  if (!isNaN(commDate.getTime())) {
                    const commYear = commDate.getFullYear();
                    const commMonth = commDate.getMonth();

                    // Viewed year/month must be >= commencement year/month
                    if (year > commYear || (year === commYear && month >= commMonth)) {
                      let isMatured = false;
                      if (l.maturityDate) {
                        const matDate = new Date(l.maturityDate);
                        if (!isNaN(matDate.getTime())) {
                          if (
                            year > matDate.getFullYear() ||
                            (year === matDate.getFullYear() && month > matDate.getMonth())
                          ) {
                            isMatured = true;
                          }
                        }
                      }

                      if (!isMatured && month === commMonth) {
                        const dueDay = Math.min(commDate.getDate(), daysInMonth);
                        dueDays[dueDay] = (dueDays[dueDay] || []).concat({
                          label: `LIC: ${l.planName}`,
                          color: THEME.sage,
                        });
                      }
                    }
                  }
                }
              });

              // 5. TERM PLAN PREMIUMS: recurring logic by anniversary month and active range
              (state.termPlans || []).forEach((t: any) => {
                if (t.startDate) {
                  const commDate = new Date(t.startDate);
                  if (!isNaN(commDate.getTime())) {
                    const commYear = commDate.getFullYear();
                    const commMonth = commDate.getMonth();

                    // Viewed year/month must be >= commencement year/month
                    if (year > commYear || (year === commYear && month >= commMonth)) {
                      let isExpired = false;
                      if (t.expiryDate) {
                        const expDate = new Date(t.expiryDate);
                        if (!isNaN(expDate.getTime())) {
                          if (
                            year > expDate.getFullYear() ||
                            (year === expDate.getFullYear() && month > expDate.getMonth())
                          ) {
                            isExpired = true;
                          }
                        }
                      }

                      // Also check if we have finished paying based on premium paying term
                      const payTerm = t.premiumPayingTerm
                        ? parseInt(t.premiumPayingTerm, 10)
                        : t.term
                          ? parseInt(t.term, 10)
                          : null;
                      if (payTerm && !isNaN(payTerm)) {
                        const yearsElapsed = year - commYear;
                        if (yearsElapsed >= payTerm) {
                          isExpired = true; // Premium paying term ended
                        }
                      }

                      if (!isExpired && month === commMonth) {
                        const dueDay = Math.min(commDate.getDate(), daysInMonth);
                        dueDays[dueDay] = (dueDays[dueDay] || []).concat({
                          label: `Term: ${t.planName || "Plan"}`,
                          color: THEME.sage,
                        });
                      }
                    }
                  }
                }
              });

              // 6. INVESTMENT PLAN PREMIUMS: recurring logic by anniversary month and active range
              (state.investmentPlans || []).forEach((ip: any) => {
                if (ip.commencementDate) {
                  const commDate = new Date(ip.commencementDate);
                  if (!isNaN(commDate.getTime())) {
                    const commYear = commDate.getFullYear();
                    const commMonth = commDate.getMonth();

                    // Viewed year/month must be >= commencement year/month
                    if (year > commYear || (year === commYear && month >= commMonth)) {
                      let isMatured = false;
                      if (ip.maturityDate) {
                        const matDate = new Date(ip.maturityDate);
                        if (!isNaN(matDate.getTime())) {
                          if (
                            year > matDate.getFullYear() ||
                            (year === matDate.getFullYear() && month > matDate.getMonth())
                          ) {
                            isMatured = true;
                          }
                        }
                      }

                      // Also check if we have finished paying based on premium paying term
                      const payTerm = ip.premiumPayingTerm
                        ? parseInt(ip.premiumPayingTerm, 10)
                        : ip.policyTerm
                          ? parseInt(ip.policyTerm, 10)
                          : null;
                      if (payTerm && !isNaN(payTerm)) {
                        const yearsElapsed = year - commYear;
                        if (yearsElapsed >= payTerm) {
                          isMatured = true; // Premium paying term ended
                        }
                      }

                      if (!isMatured && month === commMonth) {
                        const dueDay = Math.min(commDate.getDate(), daysInMonth);
                        dueDays[dueDay] = (dueDays[dueDay] || []).concat({
                          label: `Invest: ${ip.planName || "Plan"}`,
                          color: THEME.sage,
                        });
                      }
                    }
                  }
                }
              });

              // 7. RENTED PROPERTIES: monthly rent due day within active agreement range (paid vs unpaid status coloring)
              (state.rentedProperties || [])
                .filter((p: any) => p.isActive !== false && Number(p.monthlyRent) > 0)
                .forEach((p: any) => {
                  let isAgreementActive = true;
                  if (p.agreementStart) {
                    const start = new Date(p.agreementStart);
                    if (!isNaN(start.getTime())) {
                      if (
                        year < start.getFullYear() ||
                        (year === start.getFullYear() && month < start.getMonth())
                      ) {
                        isAgreementActive = false;
                      }
                    }
                  }
                  if (p.agreementEnd) {
                    const end = new Date(p.agreementEnd);
                    if (!isNaN(end.getTime())) {
                      if (
                        year > end.getFullYear() ||
                        (year === end.getFullYear() && month > end.getMonth())
                      ) {
                        isAgreementActive = false;
                      }
                    }
                  }

                  if (isAgreementActive) {
                    const day = p.dueDay ? parseInt(p.dueDay, 10) : 5;
                    if (!isNaN(day) && day >= 1 && day <= 31) {
                      const targetDay = Math.min(day, daysInMonth);
                      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
                      const isPaid = (p.payments || []).some(
                        (pay: any) => pay.date && pay.date.startsWith(monthStr)
                      );
                      dueDays[targetDay] = (dueDays[targetDay] || []).concat({
                        label: `${p.propertyName || "Rent"}${isPaid ? " (Paid)" : " Rent"}`,
                        color: isPaid ? THEME.sage : THEME.gold,
                      });
                    }
                  }
                });

              // 8. FD MATURITIES: highlight when FDs mature this month
              (state.fixedDeposits || [])
                .filter((f: any) => f.maturityDate)
                .forEach((f: any) => {
                  const [fyy, fmm, fdd] = f.maturityDate.split("-").map(Number);
                  if (fyy === year && fmm - 1 === month) {
                    const targetDay = Math.min(fdd, daysInMonth);
                    dueDays[targetDay] = (dueDays[targetDay] || []).concat({
                      label: `${f.bank || "FD"} Matures`,
                      color: THEME.sage,
                    });
                  }
                });

              // 9. SIP AUTO-DEDUCTIONS: recurring on the day the SIP was started
              (state.sips || [])
                .filter((s: any) => Number(s.amount || 0) > 0 && !s.isCompleted)
                .forEach((s: any) => {
                  if (!s.startDate) return;
                  const sipStart = new Date(s.startDate + "T00:00:00");
                  if (isNaN(sipStart.getTime())) return;
                  const sipStartYear = sipStart.getFullYear();
                  const sipStartMonth = sipStart.getMonth();
                  if (year < sipStartYear || (year === sipStartYear && month < sipStartMonth))
                    return;
                  const sipDay = sipStart.getDate();
                  const targetDay = Math.min(sipDay, daysInMonth);
                  dueDays[targetDay] = (dueDays[targetDay] || []).concat({
                    label: `SIP: ${s.scheme || s.fund || "Fund"}`,
                    color: "#818CF8",
                  });
                });

              // 10. LOAN EMIS: recurring monthly EMI due on the loan's start day
              (state.loansTaken || [])
                .filter((l: any) => Number(l.outstanding || 0) > 0 && Number(l.emi || 0) > 0)
                .forEach((l: any) => {
                  let emiDay = 5;
                  if (l.startDate) {
                    const ld = new Date(l.startDate + "T00:00:00");
                    if (!isNaN(ld.getTime())) {
                      const lStartYear = ld.getFullYear();
                      const lStartMonth = ld.getMonth();
                      if (year < lStartYear || (year === lStartYear && month < lStartMonth)) return;
                      emiDay = ld.getDate();
                    }
                  }
                  const targetDay = Math.min(emiDay, daysInMonth);
                  dueDays[targetDay] = (dueDays[targetDay] || []).concat({
                    label: `EMI: ${l.loanName || l.bank || "Loan"}`,
                    color: THEME.rust,
                  });
                });

              const cells: (number | null)[] = [];
              for (let i = 0; i < firstDay; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);

              return (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <div
                        key={d}
                        style={{
                          textAlign: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          color: THEME.muted,
                          padding: "4px 0",
                        }}
                      >
                        {d}
                      </div>
                    ))}
                    {cells.map((d, i) => {
                      const hasEvents = d && dueDays[d] && dueDays[d].length > 0;
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            if (d && hasEvents) {
                              setSelectedDayEvents({ day: d, events: dueDays[d] });
                            }
                          }}
                          style={{
                            minHeight: 60,
                            padding: 6,
                            borderRadius: 10,
                            fontSize: 11,
                            background:
                              d && d === today2
                                ? `${THEME.accent}26`
                                : d && dueDays[d]
                                  ? `${THEME.gold}0f`
                                  : "transparent",
                            border:
                              d && d === today2
                                ? `1.5px solid ${THEME.accent}`
                                : d && dueDays[d]
                                  ? `1px dashed ${THEME.gold}4d`
                                  : `1px solid ${THEME.line}`,
                            cursor: hasEvents ? "pointer" : "default",
                            transition: "all 0.18s ease-in-out",
                          }}
                          className={hasEvents ? "hover:scale-[1.03] hover:shadow-lg" : ""}
                        >
                          {d && (
                            <>
                              <div
                                style={{
                                  fontWeight: d === today2 ? 800 : 600,
                                  color: d === today2 ? THEME.accent : THEME.ink,
                                  marginBottom: 4,
                                }}
                              >
                                {d}
                              </div>
                              {(dueDays[d] || []).slice(0, 2).map((due: any, j: number) => (
                                <div
                                  key={j}
                                  style={{
                                    fontSize: 9,
                                    color: due.color,
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    marginBottom: 2,
                                  }}
                                >
                                  {due.label}
                                </div>
                              ))}
                              {dueDays[d] && dueDays[d].length > 2 && (
                                <div
                                  style={{
                                    fontSize: 8,
                                    color: THEME.accent,
                                    fontWeight: 800,
                                    marginTop: 4,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <span>•</span> {dueDays[d].length - 2} more
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 11,
                      color: THEME.muted,
                      marginTop: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      <span style={{ color: THEME.rust, fontWeight: 700 }}>●</span> CC dues / EMIs
                    </span>
                    <span>
                      <span style={{ color: THEME.gold, fontWeight: 700 }}>●</span> Subs / Unpaid
                      Rent
                    </span>
                    <span>
                      <span style={{ color: THEME.accent, fontWeight: 700 }}>●</span> Advance tax
                    </span>
                    <span>
                      <span style={{ color: THEME.sage, fontWeight: 700 }}>●</span> Insurance / FD
                      maturity / Paid Rent
                    </span>
                    <span>
                      <span style={{ color: "#818CF8", fontWeight: 700 }}>●</span> SIP deductions
                    </span>
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      )}

      {/* ────────────────── SUB-TAB: HABITS & REWARDS ────────────────── */}
      {sub === "habits" && (
        <div
          key="habits"
          className="tab-content-enter"
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {/* ── HERO CARD: always-dark navy — matches Dashboard Wealth Overview ── */}
          {/* #0F172A = --t-darkInk in dark mode; hardcoded so it stays dark in light mode too */}
          <Card style={{ padding: 0, overflow: "hidden", borderRadius: 20, background: "#0F172A" }}>
            {/* Thin accent stripe — identifies current theme color */}
            <div
              style={{
                height: 3,
                background:
                  "linear-gradient(90deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 50%, #34d399))",
              }}
            />

            <div
              style={{
                padding: "28px 24px 22px",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Decorative radial glow — matches Dashboard's sparkline overlay */}
              <div
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 260,
                  height: 260,
                  background:
                    "radial-gradient(circle, color-mix(in srgb, var(--t-accent) 18%, transparent) 0%, transparent 65%)",
                  pointerEvents: "none",
                }}
              />
              {/* Label row — mirrors "WEALTH OVERVIEW" label pattern */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 20,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--t-accent)",
                    boxShadow: "0 0 10px color-mix(in srgb, var(--t-accent) 60%, transparent)",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: 700,
                  }}
                >
                  Habits & Rewards
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 18,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {/* SVG-ring level indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                    <svg width="72" height="72" viewBox="0 0 72 72" style={{ display: "block" }}>
                      <circle
                        cx="36"
                        cy="36"
                        r="30"
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="5"
                      />
                      <circle
                        cx="36"
                        cy="36"
                        r="30"
                        fill="none"
                        stroke="var(--t-accent)"
                        strokeWidth="5"
                        strokeDasharray={`${(habitsBadges.levelPct / 100) * 188.5} 188.5`}
                        strokeLinecap="round"
                        transform="rotate(-90 36 36)"
                        style={{
                          transition: "stroke-dasharray 0.8s ease",
                          filter:
                            "drop-shadow(0 0 6px color-mix(in srgb, var(--t-accent) 70%, transparent))",
                        }}
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.5)",
                          letterSpacing: "0.08em",
                          marginBottom: 1,
                        }}
                      >
                        LVL
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>
                        {habitsBadges.level}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                        color: "#fff",
                      }}
                    >
                      {habitsBadges.levelLabel}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
                      {habitsBadges.totalXP.toLocaleString()} XP earned
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      {habitsBadges.xpToNext > 0
                        ? `${habitsBadges.xpToNext} XP → ${habitsBadges.nextLevelLabel}`
                        : "🎉 Max level reached!"}
                    </div>
                  </div>
                </div>

                {/* Health Score — center */}
                <div style={{ textAlign: "center", flex: "0 0 auto" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.4)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    Financial Health
                  </div>
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 900,
                      lineHeight: 1,
                      letterSpacing: "-0.045em",
                      color: "#fff",
                    }}
                  >
                    {dashboardData.totalScore}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 5 }}>
                    {dashboardData.totalScore >= 75
                      ? "Excellent ✓"
                      : dashboardData.totalScore >= 50
                        ? "Good"
                        : "Needs Work"}
                  </div>
                </div>

                {/* Savings Streak — right */}
                <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.4)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    Savings Streak
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 5,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{dashboardData.streakEmoji}</span>
                    <span style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: "#fff" }}>
                      {dashboardData.streak}
                    </span>
                    <span style={{ fontSize: 14, color: "rgba(255,255,255,0.55)" }}>mo</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 5 }}>
                    {dashboardData.streakMsg}
                  </div>
                </div>
              </div>

              {/* XP progress bar — accent fill on dark base */}
              <div style={{ marginTop: 24, position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.4)",
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {habitsBadges.levelLabel} → {habitsBadges.nextLevelLabel}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                    {habitsBadges.levelPct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${habitsBadges.levelPct}%`,
                      background: "var(--t-accent)",
                      borderRadius: 99,
                      transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                      boxShadow: "0 0 10px color-mix(in srgb, var(--t-accent) 50%, transparent)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                background: "var(--t-paper)",
              }}
            >
              {[
                {
                  label: "Badges",
                  value: `${habitsBadges.totalEarned}/${habitsBadges.totalBadges}`,
                  icon: "🏅",
                },
                {
                  label: "Categories",
                  value: `${Object.values(habitsBadges.cats).filter((c: any) => c.earnedCount === c.total).length}/${Object.keys(habitsBadges.cats).length}`,
                  icon: "✅",
                },
                { label: "Month Streak", value: `${dashboardData.streak}mo`, icon: "🔥" },
                { label: "XP Points", value: habitsBadges.totalXP.toLocaleString(), icon: "⚡" },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: "16px 10px",
                    textAlign: "center",
                    borderRight: i < 3 ? `1px solid ${THEME.line}` : "none",
                    borderTop: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: THEME.ink,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2, fontWeight: 600 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── MONTHLY STREAK CALENDAR (new) ──────────────────────────────── */}
          <Card style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                Savings Streak Calendar
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {[
                  ["#10b981", "Saved"],
                  ["#ef4444", "Deficit"],
                  [THEME.line, "No data"],
                ].map(([color, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: color as string,
                      }}
                    />
                    <span style={{ fontSize: 10, color: THEME.muted }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {streakCalendar.map((m, i) => (
                <div
                  key={i}
                  title={
                    m.hasData
                      ? `${m.label} ${m.year}: ${m.saved ? `+${m.rate}% savings rate` : "Deficit month"}`
                      : `${m.label} ${m.year}: No data`
                  }
                  style={{
                    borderRadius: 10,
                    overflow: "hidden",
                    border: `1.5px solid ${m.hasData ? (m.saved ? "#10b98133" : "#ef444433") : THEME.line}`,
                    background: m.hasData
                      ? m.saved
                        ? "#10b98108"
                        : "#ef444408"
                      : "var(--surface-0)",
                  }}
                >
                  <div
                    style={{
                      height: 5,
                      background: m.hasData ? (m.saved ? "#10b981" : "#ef4444") : THEME.line,
                    }}
                  />
                  <div style={{ padding: "9px 8px" }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: m.hasData ? (m.saved ? "#059669" : "#dc2626") : THEME.muted,
                      }}
                    >
                      {m.label}
                    </div>
                    <div style={{ fontSize: 9, color: THEME.muted, marginTop: 1 }}>
                      {m.hasData ? (m.saved ? `${m.rate}%` : "deficit") : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── CATEGORY OVERVIEW ──────────────────────────────────────────── */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginBottom: 14 }}>
              All Categories
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {Object.entries(habitsBadges.cats).map(([cat, data]: [string, any]) => {
                const pct = Math.round((data.earnedCount / data.total) * 100);
                const complete = data.earnedCount === data.total;
                const inProg = data.earnedCount > 0 && !complete;
                return (
                  <div
                    key={cat}
                    style={{
                      padding: "11px 13px",
                      borderRadius: 12,
                      background: complete
                        ? "#10b98110"
                        : inProg
                          ? "#6366f108"
                          : "var(--surface-0)",
                      border: `1px solid ${complete ? "#10b98140" : inProg ? "#6366f125" : THEME.line}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 7,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: complete ? "#059669" : THEME.ink,
                          lineHeight: 1.2,
                        }}
                      >
                        {cat}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: complete ? "#059669" : inProg ? "#d97706" : THEME.muted,
                        }}
                      >
                        {data.earnedCount}/{data.total}
                      </div>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: THEME.line,
                        borderRadius: 99,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: complete ? "#10b981" : inProg ? "#f59e0b" : THEME.line,
                          borderRadius: 99,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ── SMART ACTION TIPS ─────────────────────────────────────────── */}
          {habitsBadges.tips.length > 0 && (
            <Card style={{ padding: 20 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: THEME.ink,
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Zap size={15} color="#d97706" style={{ flexShrink: 0 }} />
                Smart Action Tips
                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                  — personalized to your next badges
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {habitsBadges.tips.map((tip: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: i === 0 ? "#6366f10c" : "var(--surface-0)",
                      border: `1px solid ${i === 0 ? "#6366f128" : THEME.line}`,
                      borderLeft: `3px solid ${i === 0 ? "#6366f1" : i === 1 ? "#d97706" : THEME.line}`,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{tip.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                          {tip.badge}
                        </div>
                        {i === 0 && (
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: "#6366f1",
                              background: "#6366f114",
                              padding: "2px 7px",
                              borderRadius: 99,
                              border: "1px solid #6366f125",
                            }}
                          >
                            TOP PRIORITY
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.55 }}>
                        {tip.tip}
                      </div>
                      {tip.progress && (
                        <div style={{ marginTop: 8 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <span style={{ fontSize: 9, color: THEME.muted, fontWeight: 700 }}>
                              {tip.progress.label}
                            </span>
                            <span style={{ fontSize: 9, color: "#6366f1", fontWeight: 800 }}>
                              {tip.pct}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 3,
                              background: THEME.line,
                              borderRadius: 99,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${tip.pct}%`,
                                background: "#6366f1",
                                borderRadius: 99,
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── BADGE CATEGORIES ──────────────────────────────────────────── */}
          {Object.entries(habitsBadges.cats).map(([catName, catData]: [string, any]) => {
            const allEarned = catData.earnedCount === catData.total;
            const unlock = CATEGORY_UNLOCK_TIP[catName];
            const catPct = Math.round((catData.earnedCount / catData.total) * 100);
            return (
              <div key={catName}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{catName}</div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        color: allEarned
                          ? "#059669"
                          : catData.earnedCount > 0
                            ? "#d97706"
                            : THEME.muted,
                        background: allEarned
                          ? "#10b98114"
                          : catData.earnedCount > 0
                            ? "#f59e0b14"
                            : "var(--surface-0)",
                        border: `1px solid ${allEarned ? "#10b98140" : catData.earnedCount > 0 ? "#f59e0b33" : THEME.line}`,
                      }}
                    >
                      {catData.earnedCount}/{catData.total}
                    </div>
                  </div>
                  {allEarned ? (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#059669",
                        fontWeight: 800,
                        background: "#10b98114",
                        padding: "2px 10px",
                        borderRadius: 99,
                        border: "1px solid #10b98133",
                      }}
                    >
                      ✓ Complete
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>
                      {catPct}%
                    </span>
                  )}
                </div>
                <div
                  style={{
                    height: 3,
                    background: THEME.line,
                    borderRadius: 99,
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${catPct}%`,
                      background: allEarned
                        ? "#10b981"
                        : catData.earnedCount > 0
                          ? "#f59e0b"
                          : THEME.line,
                      borderRadius: 99,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(138px, 1fr))",
                    gap: 12,
                  }}
                >
                  {catData.badges.map((b: any) => {
                    const isEarned = b.status === "earned";
                    const isActive = b.status === "active";
                    const pct = b.progress
                      ? Math.min(100, Math.round((b.progress.current / b.progress.target) * 100))
                      : 0;
                    const xp = TIER_XP[b.tier] || 10;
                    return (
                      <div
                        key={b.id}
                        style={{
                          padding: "16px 14px",
                          borderRadius: 16,
                          background: isEarned
                            ? "linear-gradient(145deg, #10b98118, var(--t-paper))"
                            : isActive
                              ? "linear-gradient(145deg, #6366f10d, var(--t-paper))"
                              : "var(--surface-0)",
                          border: isEarned
                            ? "1.5px solid #10b98155"
                            : isActive
                              ? "1.5px solid #6366f135"
                              : `1px solid ${THEME.line}`,
                          opacity: b.status === "locked" ? 0.4 : 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 7,
                          position: "relative",
                          boxShadow: isEarned
                            ? "0 4px 18px #10b98112"
                            : isActive
                              ? "0 2px 10px #6366f110"
                              : "none",
                          transition: "box-shadow 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 9,
                            right: 9,
                            fontSize: 8,
                            fontWeight: 900,
                            color: isEarned ? "#059669" : THEME.muted,
                            background: isEarned ? "#10b98118" : "var(--surface-0)",
                            border: `1px solid ${isEarned ? "#10b98144" : THEME.line}`,
                            padding: "1px 5px",
                            borderRadius: 6,
                          }}
                        >
                          +{xp} XP
                        </div>

                        <div
                          style={{
                            fontSize: 28,
                            lineHeight: 1,
                            filter: b.status === "locked" ? "grayscale(1) opacity(0.4)" : "none",
                          }}
                        >
                          {b.icon}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: isEarned ? "#059669" : isActive ? THEME.ink : THEME.muted,
                            lineHeight: 1.2,
                            paddingRight: 32,
                          }}
                        >
                          {b.label}
                        </div>
                        <div
                          style={{ fontSize: 10, color: THEME.muted, lineHeight: 1.45, flex: 1 }}
                        >
                          {b.desc}
                        </div>

                        {isEarned && (
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 900,
                              color: "#059669",
                              background: "#10b98114",
                              padding: "3px 8px",
                              borderRadius: 99,
                              alignSelf: "flex-start",
                              border: "1px solid #10b98130",
                            }}
                          >
                            ✓ Earned
                          </div>
                        )}
                        {isActive && b.progress && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 9, color: THEME.muted, fontWeight: 700 }}>
                                {b.progress.label}
                              </span>
                              <span style={{ fontSize: 9, color: "#6366f1", fontWeight: 900 }}>
                                {pct}%
                              </span>
                            </div>
                            <div
                              style={{
                                height: 4,
                                background: THEME.line,
                                borderRadius: 99,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: "linear-gradient(90deg, #6366f1, #818cf8)",
                                  borderRadius: 99,
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {isActive && !b.progress && (
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: "#6366f1",
                              background: "#6366f113",
                              padding: "3px 8px",
                              borderRadius: 99,
                              alignSelf: "flex-start",
                              border: "1px solid #6366f128",
                            }}
                          >
                            Next up →
                          </div>
                        )}
                        {b.status === "locked" && (
                          <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 600 }}>
                            🔒 Locked
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {allEarned && unlock && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 16px",
                      background: "#10b98110",
                      border: "1px solid #10b98130",
                      borderLeft: "3px solid #10b981",
                      borderRadius: 12,
                      fontSize: 11,
                      color: "#059669",
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    🎉 {unlock}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── XP BREAKDOWN BY CATEGORY (new) ────────────────────────────── */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
              XP Breakdown
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>
              Earned vs possible XP per category — shows where your financial gaps are.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {xpByCategory.map((row) => (
                <div key={row.cat}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 5,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink }}>{row.cat}</div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: row.pct === 100 ? "#059669" : row.pct > 0 ? "#6366f1" : THEME.muted,
                      }}
                    >
                      {row.earned} / {row.possible} XP
                    </div>
                  </div>
                  <div
                    style={{
                      height: 7,
                      background: THEME.line,
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${row.pct}%`,
                        background:
                          row.pct === 100
                            ? "linear-gradient(90deg, #10b981, #34d399)"
                            : row.pct > 50
                              ? "linear-gradient(90deg, #6366f1, #818cf8)"
                              : row.pct > 0
                                ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                                : THEME.line,
                        borderRadius: 99,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── PEER BENCHMARKING ─────────────────────────────────────────── */}
          <Card style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
                Peer Benchmarking
              </div>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                Your key metrics vs Indian personal finance averages and top-10% performers.
              </div>
            </div>
            <div style={{ height: 310 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      name: "Savings Rate %",
                      You: Math.max(0, Math.round(metrics.savingsRate)),
                      Average: 15,
                      Top10: 40,
                    },
                    {
                      name: "Emergency Fund (mo)",
                      You: Math.min(12, Math.round(habitsBadges.efMonthsHB * 10) / 10),
                      Average: 2,
                      Top10: 6,
                    },
                    {
                      name: "Debt-to-Asset %",
                      You: Math.round(metrics.debtToAssetRatio),
                      Average: 35,
                      Top10: 10,
                    },
                    {
                      name: "FOIR %",
                      You: Math.round(habitsBadges.foirPctHB),
                      Average: 42,
                      Top10: 15,
                    },
                    {
                      name: "Invest Rate %",
                      You: Math.min(100, Math.round(habitsBadges.investRateHB)),
                      Average: 10,
                      Top10: 35,
                    },
                  ]}
                  margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={THEME.line} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: THEME.muted, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fill: THEME.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.04)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${THEME.line}`,
                      background: "var(--t-paper)",
                      boxShadow: "var(--shadow-md)",
                      fontSize: 12,
                    }}
                    formatter={(v: any, name: string) => [
                      typeof v === "number" ? v.toFixed(1) : v,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} iconType="circle" />
                  <Bar dataKey="You" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Average" fill="#94a3b8" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Top10" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
              {[
                { label: "Savings Rate", note: "% of income saved monthly" },
                { label: "Emergency Fund", note: "months of expenses covered" },
                { label: "Debt-to-Asset", note: "lower is better" },
                { label: "FOIR", note: "EMI ÷ income — lower is better" },
                { label: "Invest Rate", note: "invested assets ÷ annual income" },
              ].map((m, i) => (
                <div key={i} style={{ fontSize: 10, color: THEME.muted }}>
                  <span style={{ fontWeight: 700, color: THEME.ink }}>{m.label}</span> — {m.note}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {showReport && (
        <MonthlyReportModal
          metrics={metrics}
          state={state}
          selectedDate={calendarDate}
          onClose={() => setShowReport(false)}
        />
      )}

      {selectedDayEvents && (
        <Modal
          title={`Scheduled Items — ${getOrdinal(selectedDayEvents.day)} ${calendarDate.toLocaleString("en-IN", { month: "long" })} ${calendarDate.getFullYear()}`}
          onClose={() => setSelectedDayEvents(null)}
          maxWidth={420}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
            {selectedDayEvents.events.map((evt, idx) => {
              const isPaid = evt.label.includes("(Paid)");
              return (
                <div
                  key={idx}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${evt.color}2e`,
                    borderLeft: `4px solid ${evt.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: THEME.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {evt.label}
                    </span>
                    <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                      Monthly Scheduled Due
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <Badge
                      style={{
                        background: isPaid ? `${THEME.sage}1f` : `${THEME.gold}1f`,
                        color: isPaid ? THEME.sage : THEME.gold,
                        border: `1px solid ${isPaid ? THEME.sage : THEME.gold}33`,
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      {isPaid ? "Paid" : "Due"}
                    </Badge>
                    {setTab && !isPaid && (
                      <button
                        onClick={() => {
                          const lbl = evt.label.toLowerCase();
                          let targetTab = "analytics";
                          if (lbl.includes("cc:") || lbl.includes("card") || lbl.includes("bill"))
                            targetTab = "credit";
                          else if (lbl.includes("sip") || lbl.includes("mutual"))
                            targetTab = "investments";
                          else if (
                            lbl.includes("term") ||
                            lbl.includes("lic") ||
                            lbl.includes("invest")
                          )
                            targetTab = "investments";
                          else if (lbl.includes("rent")) targetTab = "rental";

                          setTab(targetTab);
                          setSelectedDayEvents(null);
                        }}
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: THEME.accent,
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.accent}44`,
                          padding: "4px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        Pay →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
};

const HeroStat = ({ label, value, negative, sage, tabId, setTab }: any) => {
  const color = negative ? "#F87171" : sage ? "#34D399" : "rgba(255,255,255,0.9)";
  const isClickable = !!(tabId && setTab);
  return (
    <div
      onClick={isClickable ? () => setTab(tabId) : undefined}
      title={isClickable ? `View in ${tabId}` : undefined}
      style={{
        borderLeft: `2px solid ${color}22`,
        paddingLeft: 12,
        cursor: isClickable ? "pointer" : "default",
        borderRadius: 6,
        padding: "4px 4px 4px 12px",
        transition: "background 0.18s ease",
      }}
      onMouseEnter={
        isClickable
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)";
            }
          : undefined
      }
      onMouseLeave={
        isClickable
          ? (e) => {
              (e.currentTarget as HTMLDivElement).style.background = "transparent";
            }
          : undefined
      }
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          marginBottom: 5,
          fontWeight: 600,
        }}
      >
        {label}
        {isClickable && <span style={{ marginLeft: 4, opacity: 0.45, fontSize: 8 }}>↗</span>}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {fmtINRFull(value)}
      </div>
    </div>
  );
};
