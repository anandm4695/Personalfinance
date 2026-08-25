// @ts-nocheck
import React, { useState, useMemo } from "react";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
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
  Shield,
  BarChart2,
  Activity,
  CheckCircle2,
  XCircle,
  Trophy,
  Crown,
  Sprout,
  Leaf,
  Coins,
  Gem,
  Medal,
  Award,
  PiggyBank,
  Bird,
  Rocket,
  Lock,
  Castle,
  TreeDeciduous,
  Settings,
  RefreshCw,
  TrendingDown,
  Lightbulb,
  Feather,
  ShieldCheck,
  Footprints,
  Flag,
  LineChart,
  Microscope,
  GraduationCap,
  Wallet,
  Waves,
  ClipboardList,
  IndianRupee,
  Bell,
  Clock,
  Moon,
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
import { THEME, PIE_COLORS, ASSET_CLASS_COLORS } from "../../utils/constants";
import { useMasterData } from "../../utils/masterData";
import {
  fmtINRFull,
  maskCurrencyInText,
  getCCDueDate,
  rdMaturity,
  fdMaturity,
  getEffectiveRent,
  calculateEpfBalance,
  today,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
  computeFireTarget,
  DEFAULT_FIRE_SWR,
} from "../../utils/finance";
import { computeNetWorthAsOf, getEarliestNetWorthMonth, nextYm } from "../../utils/netWorthAsOf";
import { getCurrentFY } from "../../utils/appConstants";
import { flattenAssets } from "../../utils/nomineeTracker";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { MonthlyReportModal } from "../modals/MonthlyReportModal";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { StockLogo } from "./DematTab";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";

// ─── BADGE CATALOG ───────────────────────────────────────────────────────────
// Each category is a sequential tier chain. Badges unlock when the previous tier
// in the same category is earned. Standalone badges (tier 1 only) are always "active".
const BADGE_CATALOG = [
  // Savings Streak
  {
    id: "s1",
    cat: "Savings Streak",
    tier: 1,
    icon: CheckCircle2,
    label: "First Win",
    desc: "Save more than you spend for 1 month",
  },
  {
    id: "s3",
    cat: "Savings Streak",
    tier: 2,
    icon: Zap,
    label: "On a Roll",
    desc: "3-month savings streak",
  },
  {
    id: "s6",
    cat: "Savings Streak",
    tier: 3,
    icon: Flame,
    label: "Fire Saver",
    desc: "6 consecutive months of net saving",
  },
  {
    id: "s12",
    cat: "Savings Streak",
    tier: 4,
    icon: Trophy,
    label: "Savings Champion",
    desc: "12-month savings streak",
  },
  {
    id: "s24",
    cat: "Savings Streak",
    tier: 5,
    icon: Crown,
    label: "Legendary Saver",
    desc: "24 months of consistent saving",
  },
  // Wealth Builder
  {
    id: "w1",
    cat: "Wealth Builder",
    tier: 1,
    icon: Sprout,
    label: "₹1L Club",
    desc: "Net worth crossed ₹1 Lakh",
  },
  {
    id: "w5",
    cat: "Wealth Builder",
    tier: 2,
    icon: Leaf,
    label: "₹5L Club",
    desc: "Net worth crossed ₹5 Lakh",
  },
  {
    id: "w10",
    cat: "Wealth Builder",
    tier: 3,
    icon: Coins,
    label: "₹10L Club",
    desc: "Net worth crossed ₹10 Lakh",
  },
  {
    id: "w25",
    cat: "Wealth Builder",
    tier: 4,
    icon: Gem,
    label: "₹25L Club",
    desc: "Net worth crossed ₹25 Lakh",
  },
  {
    id: "w50",
    cat: "Wealth Builder",
    tier: 5,
    icon: Medal,
    label: "₹50L Club",
    desc: "Net worth crossed ₹50 Lakh",
  },
  {
    id: "w1c",
    cat: "Wealth Builder",
    tier: 6,
    icon: Award,
    label: "Crorepati",
    desc: "Net worth crossed ₹1 Crore",
  },
  // Smart Saver
  {
    id: "sr10",
    cat: "Smart Saver",
    tier: 1,
    icon: PiggyBank,
    label: "Saver",
    desc: "Savings rate above 10%",
  },
  {
    id: "sr20",
    cat: "Smart Saver",
    tier: 2,
    icon: TrendingUp,
    label: "Smart Saver",
    desc: "Savings rate above 20%",
  },
  {
    id: "sr30",
    cat: "Smart Saver",
    tier: 3,
    icon: Bird,
    label: "Power Saver",
    desc: "Savings rate above 30%",
  },
  {
    id: "sr50",
    cat: "Smart Saver",
    tier: 4,
    icon: Rocket,
    label: "Super Saver",
    desc: "Saving 50%+ of monthly income",
  },
  // Safety Net
  {
    id: "ef1",
    cat: "Safety Net",
    tier: 1,
    icon: Shield,
    label: "Buffer Started",
    desc: "1 month of expenses in cash reserves",
  },
  {
    id: "ef3",
    cat: "Safety Net",
    tier: 2,
    icon: Lock,
    label: "Safety Net",
    desc: "3-month emergency fund",
  },
  {
    id: "ef6",
    cat: "Safety Net",
    tier: 3,
    icon: Castle,
    label: "Fortress",
    desc: "6-month emergency fund — fully covered",
  },
  // Investor
  {
    id: "iv1",
    cat: "Investor",
    tier: 1,
    icon: Sprout,
    label: "First Investment",
    desc: "Invested in at least one instrument",
  },
  {
    id: "iv3",
    cat: "Investor",
    tier: 2,
    icon: Leaf,
    label: "Diversified",
    desc: "Spread across 3+ asset types",
  },
  {
    id: "iv5",
    cat: "Investor",
    tier: 3,
    icon: TreeDeciduous,
    label: "Master Investor",
    desc: "Invested in 5+ different asset types",
  },
  // SIP Habit (standalone mini-chain)
  {
    id: "sip1",
    cat: "SIP Habit",
    tier: 1,
    icon: Settings,
    label: "SIP Started",
    desc: "Running at least 1 active SIP",
  },
  {
    id: "sip5",
    cat: "SIP Habit",
    tier: 2,
    icon: RefreshCw,
    label: "SIP Warrior",
    desc: "Total SIP ≥ ₹5,000/month",
  },
  // Debt Smart
  {
    id: "d40",
    cat: "Debt Smart",
    tier: 1,
    icon: TrendingDown,
    label: "Light Borrower",
    desc: "Total EMIs below 40% of income (FOIR)",
  },
  {
    id: "d20",
    cat: "Debt Smart",
    tier: 2,
    icon: Lightbulb,
    label: "Lean Borrower",
    desc: "Total EMIs below 20% of income",
  },
  {
    id: "df",
    cat: "Debt Smart",
    tier: 3,
    icon: Feather,
    label: "Debt Free",
    desc: "Zero loans and liabilities",
  },
  // Credit Smart
  {
    id: "cc0",
    cat: "Credit Smart",
    tier: 1,
    icon: CreditCard,
    label: "Zero Balance",
    desc: "No outstanding on any credit card",
  },
  {
    id: "cc30",
    cat: "Credit Smart",
    tier: 2,
    icon: Target,
    label: "Credit Ace",
    desc: "Credit utilization below 30%",
  },
  // Protected
  {
    id: "p1",
    cat: "Protected",
    tier: 1,
    icon: ShieldCheck,
    label: "Insured",
    desc: "Has at least one term plan or LIC",
  },
  {
    id: "p2",
    cat: "Protected",
    tier: 2,
    icon: Landmark,
    label: "Well Protected",
    desc: "Insurance cover ≥ 10× annual income",
  },
  // Goal Setter
  {
    id: "g1",
    cat: "Goal Setter",
    tier: 1,
    icon: Target,
    label: "Goal Setter",
    desc: "Created your first financial goal",
  },
  {
    id: "g2",
    cat: "Goal Setter",
    tier: 2,
    icon: Footprints,
    label: "Goal Chaser",
    desc: "One goal is 50%+ funded",
  },
  {
    id: "g3",
    cat: "Goal Setter",
    tier: 3,
    icon: Flag,
    label: "Goal Crusher",
    desc: "Fully achieved at least one goal",
  },
  // Finance Nerd
  {
    id: "fn1",
    cat: "Finance Nerd",
    tier: 1,
    icon: BarChart2,
    label: "Tracker",
    desc: "1+ months of transactions logged",
  },
  {
    id: "fn3",
    cat: "Finance Nerd",
    tier: 2,
    icon: LineChart,
    label: "Consistent",
    desc: "3+ months of financial data",
  },
  {
    id: "fn6",
    cat: "Finance Nerd",
    tier: 3,
    icon: Microscope,
    label: "Data Driven",
    desc: "6+ months of financial history",
  },
  {
    id: "fn12",
    cat: "Finance Nerd",
    tier: 4,
    icon: GraduationCap,
    label: "Finance Nerd",
    desc: "12+ months of full tracking",
  },
  // Tax Saver
  {
    id: "tax1",
    cat: "Tax Saver",
    tier: 1,
    icon: Receipt,
    label: "80C Investor",
    desc: "Invested in at least one 80C instrument (PPF, ELSS, NPS, LIC, EPF)",
  },
  {
    id: "tax2",
    cat: "Tax Saver",
    tier: 2,
    icon: Trophy,
    label: "80C Maxed",
    desc: "Utilized the full ₹1.5L 80C tax deduction limit for the year",
  },
  // Passive Income
  {
    id: "pi5k",
    cat: "Passive Income",
    tier: 1,
    icon: Wallet,
    label: "Passive Earner",
    desc: "Monthly passive income ≥ ₹5,000 (rent, dividends, interest)",
  },
  {
    id: "pi25k",
    cat: "Passive Income",
    tier: 2,
    icon: Waves,
    label: "Income Builder",
    desc: "Monthly passive income ≥ ₹25,000",
  },
  {
    id: "pi1L",
    cat: "Passive Income",
    tier: 3,
    icon: Feather,
    label: "Freedom Income",
    desc: "Monthly passive income ≥ ₹1 Lakh — a true financial independence milestone",
  },
  // Budget Pro
  {
    id: "b1",
    cat: "Budget Pro",
    tier: 1,
    icon: ClipboardList,
    label: "Budget Starter",
    desc: "Set up at least one spending budget category",
  },
  {
    id: "b3",
    cat: "Budget Pro",
    tier: 2,
    icon: Target,
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

// Maps metrics.emergencyFund.tier -> display color, kept in sync with the same
// mapping used by EmergencyFundTab so the dashboard widget and the dedicated
// tab never disagree on what color a given "months covered" figure gets.
const TIER_COLOR_EF: Record<string, string> = {
  critical: THEME.rust,
  building: THEME.gold,
  healthy: THEME.accent,
  excellent: THEME.sage,
};

interface AnalyticsTabProps {
  metrics: any;
  state: any;
  assetBreakdown: any[];
  trendData: any[];
  setState: any;
  marketData?: any;
  marketDataTs?: number | null;
  updateMasterData?: any;
  updateItem?: any;
  setTab?: any;
  setSubTab?: any;
  showToast?: (msg: string, type?: string) => void;
  dashboardWidgets?: Record<string, boolean>;
  onUpdateWidgets?: (widgets: Record<string, boolean>) => void;
  activeProfile?: string;
}

// Each key gates a real section on the Dashboard sub-tab (the default view of
// this tab) — see the `dashboardWidgets?.["<key>"]` checks wrapping those
// sections below. Keys mirror the DashboardSectionHeader groups already
// visible in the UI so toggling one off never orphans a header with nothing
// under it.
const DASHBOARD_WIDGET_DEFS = [
  { key: "smartInsights", label: "Smart Insights" },
  { key: "coreWealthVitals", label: "Core Wealth & Vitals" },
  { key: "cashFlowLiquidity", label: "Cash Flow & Liquidity" },
  { key: "estateComparison", label: "Estate & Comparison Analysis" },
  { key: "recentActivity", label: "Recent Ledger Activity" },
];

const DashboardSectionHeader: React.FC<{
  title: string;
  desc: string;
  icon?: React.ReactNode;
}> = ({ title, desc, icon }) => {
  return (
    <div className="bento-col-12 animate-fade-in-up" style={{ marginTop: 24, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && (
          <div style={{ color: THEME.accent, display: "flex", alignItems: "center" }}>{icon}</div>
        )}
        <span
          style={{
            fontSize: 15,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: THEME.ink,
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: THEME.line }} />
      </div>
      <p
        style={{
          fontSize: 12,
          color: THEME.muted,
          marginTop: 4,
          marginBottom: 0,
          fontWeight: 500,
        }}
      >
        {desc}
      </p>
    </div>
  );
};

// Asset-class names here also appear, with their own fixed color, on other
// tabs' asset-class charts (this tab's own coarser Portfolio Rebalancing
// widget below, Portfolio/Investment Statement, Annual Report, Family View).
// Positional PIE_COLORS indexing alone can't keep those in sync — the same
// category's index shifts depending on which other categories a given user
// has non-zero balances in — so pin every recognized name to the app-wide
// canonical color and let anything else fall back to the positional palette.
const getAssetClassColor = (name: string, index: number) =>
  ASSET_CLASS_COLORS[name] || PIE_COLORS[index % PIE_COLORS.length];

// Maps each Bill Calendar event `type` (set in calendarDueDays) to the tab a
// user would go to in order to act on it. Advance Tax and FD Maturity have no
// natural "pay" destination, so they're omitted — the Pay button is hidden
// for those rather than routing back to the calendar itself.
const EVENT_TYPE_TO_TARGET_TAB: Record<string, string> = {
  card: "credit",
  loanEmi: "amortization",
  sip: "investments",
  insurance: "investments",
  investmentPlan: "investments",
  rent: "rental",
  subscription: "subs",
};

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  metrics,
  state,
  assetBreakdown,
  trendData,
  setState,
  marketData,
  marketDataTs,
  updateMasterData,
  updateItem,
  setTab,
  setSubTab,
  showToast,
  dashboardWidgets,
  onUpdateWidgets,
  activeProfile = "all",
}) => {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const isDark = state.settings?.darkMode ?? false;
  const animatedNetWorth = useAnimatedNumber(metrics.netWorth || 0);
  const [sub, setSub] = useState("dashboard");
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
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
    return (
      state.masterData?._rebalTargets || { equity: 60, debt: 25, cash: 10, realEstate: 0, other: 5 }
    );
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

  // ── Rebalance with New Money States ──
  const [rebalWithNewMoney, setRebalWithNewMoney] = useState(false);
  const [newInvestAmount, setNewInvestAmount] = useState("");

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

  // ── Year-on-Year FY Comparison States ──
  const [yoyOpen, setYoyOpen] = useState(false);
  const yoyCurrentFYStart = useMemo(() => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  }, []);
  const [yoyFY1, setYoyFY1] = useState<number>(() => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  });
  const [yoyFY2, setYoyFY2] = useState<number>(() => {
    const now = new Date();
    return (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) - 1;
  });

  // ── Estate Planning — Nomination Coverage States ──
  const [nominationOpen, setNominationOpen] = useState(false);
  const [nomineeModal, setNomineeModal] = useState<{
    key: string;
    ids: string[];
    type: string;
    name: string;
  } | null>(null);
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeRelation, setNomineeRelation] = useState("Spouse");
  const [nomineeSaving, setNomineeSaving] = useState(false);
  const NOMINEE_RELATION_OPTIONS = ["Spouse", "Child", "Parent", "Sibling", "Other"];

  const openNomineeModal = (acc: { key: string; ids: string[]; type: string; name: string }) => {
    setNomineeName("");
    setNomineeRelation("Spouse");
    setNomineeModal(acc);
  };

  const handleAssignNominee = async () => {
    if (!nomineeModal || !nomineeName.trim() || !updateItem) return;
    setNomineeSaving(true);
    try {
      await Promise.all(
        nomineeModal.ids.map((itemId) =>
          updateItem(nomineeModal.key, itemId, {
            nominee: nomineeName.trim(),
            nomineeRelation,
          })
        )
      );
      setNomineeModal(null);
      setNomineeName("");
      setNomineeRelation("Spouse");
    } catch (e: any) {
      showToast?.(`Failed to save nominee: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setNomineeSaving(false);
    }
  };
  const [nwPercentileAge, setNwPercentileAge] = useState(35);
  const [estateChecklist, setEstateChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("finance_estate_checklist");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const toggleEstateItem = (key: string) => {
    setEstateChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("finance_estate_checklist", JSON.stringify(next));
      return next;
    });
  };

  // ── Year-on-Year: derive available FYs from data dates ──
  const yoyAvailableFYs = useMemo(() => {
    const fySet = new Set<number>();
    const addDate = (d: string) => {
      if (!d) return;
      const dt = new Date(d + "T00:00:00");
      const yr = dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
      fySet.add(yr);
    };
    (state.income || []).forEach((i: any) => addDate(i.date));
    (state.transactions || []).forEach((t: any) => addDate(t.date));
    (state.stocks || []).forEach((s: any) => addDate(s.buyDate));
    (state.mutualFunds || []).forEach((m: any) => addDate(m.buyDate));
    // Always include current FY and previous FY
    fySet.add(yoyCurrentFYStart);
    fySet.add(yoyCurrentFYStart - 1);
    return Array.from(fySet).sort((a, b) => b - a); // newest first
  }, [state.income, state.transactions, state.stocks, state.mutualFunds, yoyCurrentFYStart]);

  const yoyComparison = useMemo(() => {
    const computeFY = (startYear: number) => {
      const fyStartStr = `${startYear}-04-01`;
      const fyEndStr = `${startYear + 1}-03-31`;

      // Income from income ledger (authoritative), fallback to transaction credits
      const incomeLedger = (state.income || [])
        .filter((i: any) => i.date && i.date >= fyStartStr && i.date <= fyEndStr)
        .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      const txnIncome = (state.transactions || [])
        .filter(
          (t: any) =>
            t.date &&
            t.date >= fyStartStr &&
            t.date <= fyEndStr &&
            t.type === "credit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const totalIncome = incomeLedger > 0 ? incomeLedger : txnIncome;

      // Expenses from debit transactions + rent payments
      const txnExpense = (state.transactions || [])
        .filter(
          (t: any) =>
            t.date &&
            t.date >= fyStartStr &&
            t.date <= fyEndStr &&
            t.type === "debit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer" &&
            t.category !== "Investment"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const rentPaid = (state.rentedProperties || []).reduce(
        (sum: number, p: any) =>
          sum +
          (p.payments || [])
            .filter((pay: any) => pay.date && pay.date >= fyStartStr && pay.date <= fyEndStr)
            .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0),
        0
      );
      const totalExpense = txnExpense + rentPaid;

      const savings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

      // Investment additions within FY
      const stockBuys = (state.stocks || [])
        .filter((s: any) => s.buyDate && s.buyDate >= fyStartStr && s.buyDate <= fyEndStr)
        .reduce((s: number, st: any) => s + Number(st.invested || st.avgPrice * st.qty || 0), 0);
      const mfBuys = (state.mutualFunds || [])
        .filter((m: any) => m.buyDate && m.buyDate >= fyStartStr && m.buyDate <= fyEndStr)
        .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);
      const fdAdds = (state.fixedDeposits || [])
        .filter((fd: any) => fd.startDate && fd.startDate >= fyStartStr && fd.startDate <= fyEndStr)
        .reduce((s: number, fd: any) => s + Number(fd.principal || 0), 0);
      const ppfAdds = (state.ppf || []).reduce(
        (sum: number, p: any) =>
          sum +
          (p.transactions || [])
            .filter(
              (t: any) =>
                t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
            )
            .reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
        0
      );
      const investmentAdditions = stockBuys + mfBuys + fdAdds + ppfAdds;

      // Net worth at end of FY (March of startYear+1) — only valid for "all" profile
      let netWorth = 0;
      if (activeProfile === "all") {
        const marchKey = `${startYear + 1}-03`;
        const nwEntry = (state.netWorthHistory || []).find((h: any) => h.month === marchKey);
        netWorth = nwEntry ? Number(nwEntry.netWorth || 0) : 0;
      }

      return { totalIncome, totalExpense, savings, savingsRate, investmentAdditions, netWorth };
    };

    const fy1 = computeFY(yoyFY1);
    const fy2 = computeFY(yoyFY2);

    const change = (v1: number, v2: number) => v1 - v2;
    const pctChange = (v1: number, v2: number) =>
      v2 !== 0 ? ((v1 - v2) / Math.abs(v2)) * 100 : v1 > 0 ? 100 : 0;

    const rows = [
        {
          label: "Total Income",
          v1: fy1.totalIncome,
          v2: fy2.totalIncome,
          change: change(fy1.totalIncome, fy2.totalIncome),
          pct: pctChange(fy1.totalIncome, fy2.totalIncome),
          invertColor: false,
        },
        {
          label: "Total Expenses",
          v1: fy1.totalExpense,
          v2: fy2.totalExpense,
          change: change(fy1.totalExpense, fy2.totalExpense),
          pct: pctChange(fy1.totalExpense, fy2.totalExpense),
          invertColor: true,
        },
        {
          label: "Savings",
          v1: fy1.savings,
          v2: fy2.savings,
          change: change(fy1.savings, fy2.savings),
          pct: pctChange(fy1.savings, fy2.savings),
          invertColor: false,
        },
        {
          label: "Savings Rate %",
          v1: fy1.savingsRate,
          v2: fy2.savingsRate,
          change: change(fy1.savingsRate, fy2.savingsRate),
          pct: 0,
          invertColor: false,
          isPercent: true,
        },
        {
          label: "Investment Additions",
          v1: fy1.investmentAdditions,
          v2: fy2.investmentAdditions,
          change: change(fy1.investmentAdditions, fy2.investmentAdditions),
          pct: pctChange(fy1.investmentAdditions, fy2.investmentAdditions),
          invertColor: false,
        },
      ];
    // Net worth history is only tracked at the family level — showing it per-person
    // would render a misleading "₹0" rather than the person's actual net worth.
    if (activeProfile === "all") {
      rows.push({
        label: "Net Worth (end of FY)",
        v1: fy1.netWorth,
        v2: fy2.netWorth,
        change: change(fy1.netWorth, fy2.netWorth),
        pct: pctChange(fy1.netWorth, fy2.netWorth),
        invertColor: false,
      });
    }

    return {
      fy1,
      fy2,
      rows,
      chartData: [
        {
          name: "Income",
          [`FY ${yoyFY1}-${String(yoyFY1 + 1).slice(-2)}`]: fy1.totalIncome,
          [`FY ${yoyFY2}-${String(yoyFY2 + 1).slice(-2)}`]: fy2.totalIncome,
        },
        {
          name: "Expenses",
          [`FY ${yoyFY1}-${String(yoyFY1 + 1).slice(-2)}`]: fy1.totalExpense,
          [`FY ${yoyFY2}-${String(yoyFY2 + 1).slice(-2)}`]: fy2.totalExpense,
        },
        {
          name: "Savings",
          [`FY ${yoyFY1}-${String(yoyFY1 + 1).slice(-2)}`]: fy1.savings,
          [`FY ${yoyFY2}-${String(yoyFY2 + 1).slice(-2)}`]: fy2.savings,
        },
      ],
    };
  }, [
    yoyFY1,
    yoyFY2,
    state.income,
    state.transactions,
    state.rentedProperties,
    state.stocks,
    state.mutualFunds,
    state.fixedDeposits,
    state.ppf,
    state.netWorthHistory,
    activeProfile,
  ]);

  // ── Estate Planning — Nomination Coverage Audit ──
  // Built on the same flattenAssets() the full Will & Nominee Tracker tab
  // uses, so this widget's coverage % can never drift out of sync with that
  // tab's — the two used to be independently-maintained copies that counted
  // different asset universes and showed disagreeing numbers for the same
  // data.
  const nominationAudit = useMemo(() => {
    const flat = flattenAssets(state);
    const accounts = flat.map((a) => ({
      type: a.label,
      name: a.name,
      hasNominee: a.covered,
      key: a.key,
      ids: a.ids,
    }));

    const total = accounts.length;
    const covered = accounts.filter((a) => a.hasNominee).length;
    const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

    // Priority alerts
    const insuranceMissing = flat.filter((a) => a.category === "Insurance" && !a.covered).length;
    const accountMissing = flat.filter((a) => a.category !== "Insurance" && !a.covered).length;

    return { accounts, total, covered, pct, insuranceMissing, accountMissing };
  }, [state]);

  const lastTradingDayPerformance = useMemo(() => {
    const uniqueStocks = new Map<
      string,
      { base: string; exchange: string; yfSym: string; lastPrice: number }
    >();
    (state.stocks || []).forEach((s: any) => {
      const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "");
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
        const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "");
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
          sub: `${s.qty} shares · CMP ${privacyMode ? "••••" : fmtINRFull(price)}`,
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
            sub: `${f.rate || 0}% · Due: ${
              f.maturityDate
                ? new Date(f.maturityDate + "T00:00:00").toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"
            }`,
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
              sub: `${privacyMode ? "••••" : fmtINRFull(r.monthly || 0)}/mo · ${months}/${r.tenureMonths || 0} m`,
              value: currentVal,
            };
          })
          .sort((a: any, b: any) => b.value - a.value);

      case "Mutual Funds":
        return (state.mutualFunds || [])
          .map((m: any) => ({
            name: m.name || "Mutual Fund",
            sub: `${Number(m.units || 0).toFixed(3)} units @ Nav ${privacyMode ? "••••" : fmtINRFull(Number(m.currentNav || 0))}`,
            value: Number(m.units || 0) * Number(m.currentNav || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Stocks":
        return (state.stocks || [])
          .map((s: any) => {
            const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "");
            const exch = s.exchange || "NSE";
            const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
            const md = marketData?.[yfSym];
            const price = md?.price !== undefined ? Number(md.price) : Number(s.currentPrice || 0);
            const val = Number(s.qty || 0) * price;
            return {
              name: base,
              sub: `${s.qty} shares · CMP ${privacyMode ? "••••" : fmtINRFull(price)}`,
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
            name: p.institution || p.bank || "PPF",
            sub: p.accountNumber ? `Ac: ${p.accountNumber}` : "PPF Balance",
            value: Number(p.balance || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "NPS":
        return (state.nps || [])
          .map((n: any) => {
            const bal = Number(n.balance) || 0;
            const txTotal = (n.transactions || []).reduce(
              (ss: number, t: any) =>
                ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
              0
            );
            return {
              name: n.fundManager || n.bank || "NPS",
              sub: n.pran || n.accountNumber ? `PRAN: ${n.pran || n.accountNumber}` : "NPS Balance",
              value: bal > 0 ? bal : txTotal,
            };
          })
          .sort((a: any, b: any) => b.value - a.value);

      case "EPF":
        return (state.epf || [])
          .map((e: any) => ({
            name: e.employer || e.bank || "EPF",
            sub: e.uan || e.accountNumber ? `UAN: ${e.uan || e.accountNumber}` : "EPF Balance",
            value: calculateEpfBalance(e),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Bonds":
        return (state.bonds || [])
          .map((b: any) => ({
            name: b.name || "Bond",
            sub: `${b.coupon || 0}% Coupon${b.maturityDate ? ` · Due: ${b.maturityDate}` : ""}`,
            value: Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
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

      case "Gold & SGBs": {
        const gp = getGoldPricePerGram(state);
        const PF = GOLD_PURITY_FACTOR;
        const GTYPES: Record<string, string> = {
          physical: "Physical",
          sgb: "SGB",
          digital: "Digital",
          etf: "ETF",
          mf: "MF",
        };
        return (state.goldHoldings || [])
          .map((h: any) => {
            const grams = Number(h.grams || 0);
            const pMul = h.type === "physical" ? PF[h.purity] || 1 : 1;
            return {
              name: h.name || GTYPES[h.type] || "Gold",
              sub: `${grams}g ${h.type === "physical" && h.purity ? h.purity : GTYPES[h.type] || ""}`,
              value: grams * gp * pMul,
            };
          })
          .sort((a: any, b: any) => b.value - a.value);
      }

      case "Vehicles":
        return (state.vehicles || [])
          .map((v: any) => ({
            name: `${v.make || ""} ${v.model || ""}`.trim() || "Vehicle",
            sub: `${v.year || ""} · ${v.registrationNumber || "No reg."}`,
            value: Number(v.currentValue || v.purchasePrice || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Real Estate":
        return (state.realEstateProperties || [])
          .filter((p: any) => p.status !== "sold")
          .map((p: any) => ({
            name: p.name || "Property",
            sub: `${p.location || ""} · ${p.status === "under-construction" ? "Under Const." : "Owned"}`,
            value: Number(p.marketValue || p.agreementValue || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Rental Properties":
        return (state.rentalProperties || [])
          .map((r: any) => ({
            name: r.propertyName || r.address || "Rental Property",
            sub: r.tenantName ? `Tenant: ${r.tenantName}` : "Rental",
            value: Number(r.propertyValue || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Security Deposit":
        return (state.rentedProperties || [])
          .map((p: any) => {
            const dep = p.depositTransactions?.length
              ? p.depositTransactions.reduce((s: number, tx: any) => s + Number(tx.amount || 0), 0)
              : Number(p.securityDeposit || 0);
            const returned = Number(p.depositReturned || 0);
            return {
              name: p.propertyName || p.address || "Rented Property",
              sub: p.landlordName ? `Landlord: ${p.landlordName}` : "Deposit",
              value: Math.max(0, dep - returned),
            };
          })
          .filter((x: any) => x.value > 0)
          .sort((a: any, b: any) => b.value - a.value);

      case "Informal Loans Given":
        return (state.informalLent || [])
          .map((person: any) => {
            const totalT = (person.tranches || []).reduce(
              (s: number, t: any) => s + Number(t.amount || 0),
              0
            );
            const totalP = (person.payments || []).reduce(
              (s: number, p: any) => s + Number(p.amount || 0),
              0
            );
            return {
              name: person.name || "Person",
              sub: person.relation || "Informal loan",
              value: Math.max(0, totalT - totalP),
            };
          })
          .filter((x: any) => x.value > 0)
          .sort((a: any, b: any) => b.value - a.value);

      case "Govt Schemes":
        return (state.govtSchemes || [])
          .map((sc: any) => ({
            name: sc.schemeName || sc.schemeType || "Govt Scheme",
            sub: sc.schemeType || "Government Scheme",
            value: Number(sc.currentBalance || 0),
          }))
          .sort((a: any, b: any) => b.value - a.value);

      case "Prepaid Cards":
        return (state.prepaidCards || [])
          .filter((p: any) => (p.status || "").toLowerCase() !== "closed")
          .map((p: any) => {
            const txns = p.transactions || [];
            const loaded = txns
              .filter((t: any) => t.type === "load")
              .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
            const spent = txns
              .filter((t: any) => t.type === "spend")
              .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
            return {
              name: p.cardName || "Prepaid Card",
              sub: p.last4 ? `****${p.last4}` : "Prepaid",
              value: loaded - spent,
            };
          })
          .filter((x: any) => x.value > 0)
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
      const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "");
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

  // Reconstructs net worth for each past month from every asset's own dated records
  // (buy dates, ledger entries, open/start dates, etc.) instead of reading frozen
  // monthly snapshots — so backdated entries move the correct month on the chart,
  // not just today's. See computeNetWorthAsOf for the per-category tiering/limitations.
  const netWorthTrend = useMemo(() => {
    const todayYm = today().slice(0, 7);
    const startYm = getEarliestNetWorthMonth(state);
    const points: { month: string; ym: string; value: number }[] = [];
    let cursor = startYm;
    while (cursor <= todayYm) {
      const [yr, mo] = cursor.split("-");
      const d = new Date(Number(yr), Number(mo) - 1, 1);
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const { netWorth } = computeNetWorthAsOf(state, cursor, marketData);
      points.push({ month: label, ym: cursor, value: netWorth });
      cursor = nextYm(cursor);
    }
    return points;
  }, [state, marketData]);

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

    // Liquid reserve: uses the same metrics.emergencyFund figure as the Emergency
    // Fund Health card (bank cash + near-term FDs + liquid MF + prepaid balance)
    // instead of a narrower re-derivation, so this sub-score never disagrees with
    // the dedicated tab about how many months are actually covered.
    const emergencyMonths = metrics.emergencyFund.monthsCovered;
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
                ? `color-mix(in srgb, ${THEME.gold} 45%, ${THEME.rust})`
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
                ? `color-mix(in srgb, ${THEME.gold} 45%, ${THEME.rust})`
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
                ? `color-mix(in srgb, ${THEME.gold} 45%, ${THEME.rust})`
                : THEME.rust,
        hint:
          metrics.emergencyFund.monthlyExpense > 0
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
                ? `color-mix(in srgb, ${THEME.gold} 45%, ${THEME.rust})`
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
      .filter((p: any) => p.isActive !== false && getEffectiveRent(p) > 0)
      .forEach((p: any) => {
        // Escalation-aware effective rent, not the static `monthlyRent` field —
        // that field is set once at creation and never updated as escalation
        // tiers advance, so this widget was showing a stale (too-low) amount
        // for any property past its first tier boundary.
        const rentAmt = getEffectiveRent(p);
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
              amount: rentAmt,
              daysLeft,
              // .toISOString() converts to UTC — for IST that rolls local midnight back
              // to the previous calendar day. Format from the local fields instead.
              date: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`,
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
                amount: rentAmt,
                daysLeft,
                // .toISOString() would convert to UTC and roll local midnight back a day.
                date: `${nextYear}-${String(nextMonthNorm + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`,
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
      const ym2 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txns = state.transactions.filter((t: any) => t.date && t.date.startsWith(ym2));
      const explicitInc = (state.income || [])
        .filter((inc: any) => inc.date && inc.date.startsWith(ym2))
        .reduce((s: number, inc: any) => s + Number(inc.amount || 0), 0);
      const txnInc = txns
        .filter(
          (t: any) =>
            t.type === "credit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const inc = explicitInc > 0 ? explicitInc : txnInc;
      const txnExp = txns
        .filter(
          (t: any) =>
            t.type === "debit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer" &&
            t.category !== "Investment"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const rentExp = (state.rentedProperties || []).reduce((sum: number, p: any) => {
        return (
          sum +
          (p.payments || [])
            .filter((pay: any) => pay.date && pay.date.startsWith(ym2))
            .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0)
        );
      }, 0);
      const exp = txnExp + rentExp;
      if (inc > exp && inc > 0) streak++;
      else break;
    }
    const streakEmoji =
      streak >= 12 ? Trophy : streak >= 6 ? Flame : streak >= 3 ? Zap : streak >= 1 ? CheckCircle2 : Moon;
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
    state.income,
  ]);

  const momNetWorthDelta = useMemo(() => {
    if (activeProfile !== "all") return null;
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
    // Snapshots aren't guaranteed to be adjacent calendar months (a user who skips a
    // few months, or a freshly-reopened account, leaves a gap) — labeling a multi-month
    // jump as "MoM Change" misrepresents the pace of change, so size the label to the
    // actual gap instead of always assuming exactly one month.
    const [latestY, latestM] = latest.month.split("-").map(Number);
    const [prevY, prevM] = prev.month.split("-").map(Number);
    const monthsGap = (latestY - prevY) * 12 + (latestM - prevM);
    const label = monthsGap === 1 ? "MoM Change" : monthsGap > 1 ? `${monthsGap}-Month Change` : "Change";
    return { delta, pct, monthsGap, label };
  }, [state.netWorthHistory, activeProfile]);

  const wealthVelocity = useMemo(() => {
    if (activeProfile !== "all") return null;
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
  }, [state.netWorthHistory, activeProfile]);

  // Spending breakdown for the user-selected month (supports navigation)
  const spendingData = useMemo(() => {
    const catMap: Record<string, number> = {};
    (state.transactions || [])
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.date &&
          t.date.startsWith(spendingViewMonth) &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
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
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.date &&
          t.date.startsWith(prevYm) &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
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

  // Bill Calendar due-day computation (calendar sub-tab). Memoized since it's an
  // O(n) scan across 8 different record types that previously re-ran on every
  // render of the calendar sub-tab, not just when the viewed month or the
  // underlying records changed.
  const calendarDueDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dueDays: Record<number, any[]> = {};

    // 1. CREDIT CARDS: recurring or one-off dues (excluding closed cards)
    (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .forEach((c: any) => {
        if (c.dueDate) {
          const d = new Date(c.dueDate + "T00:00:00");
          if (d.getFullYear() === year && d.getMonth() === month) {
            dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({
              label: c.issuer || "Card",
              color: THEME.rust,
              amount: Number(c.outstanding || 0),
              amountLabel: "Outstanding",
              frequency: "Monthly",
              type: "card",
            });
          }
        } else if (c.dueDay) {
          const day = parseInt(c.dueDay, 10);
          if (!isNaN(day) && day >= 1 && day <= 31) {
            const targetDay = Math.min(day, daysInMonth);
            dueDays[targetDay] = (dueDays[targetDay] || []).concat({
              label: (c.issuer || "Card") + " Bill",
              color: THEME.rust,
              amount: Number(c.outstanding || 0),
              amountLabel: "Outstanding",
              frequency: "Monthly",
              type: "card",
            });
          }
        }
      });

    // 1b. CREDIT CARD ANNUAL FEES: mark the fee month/day in amber
    (state.creditCards || [])
      .filter(
        (c: any) =>
          (c.status || "").toLowerCase() !== "closed" && Number(c.annualFee) > 0 && c.feeMonth
      )
      .forEach((c: any) => {
        if (Number(c.feeMonth) - 1 === month) {
          const fDay = Math.min(Number(c.feeDay) || 1, daysInMonth);
          dueDays[fDay] = (dueDays[fDay] || []).concat({
            label: (c.issuer || "Card") + " Annual Fee",
            color: THEME.gold,
            amount: Number(c.annualFee || 0),
            amountLabel: "Annual Fee",
            frequency: "Annual",
            type: "card",
          });
        }
      });

    // 2. SUBSCRIPTIONS: recurrent logic by cycle
    (state.subscriptions || [])
      .filter((s: any) => !s.paused)
      .forEach((s: any) => {
        if (s.renewalDate) {
          const subDate = new Date(s.renewalDate + "T00:00:00");
          const subDay = subDate.getDate();

          let isDueThisMonth = false;
          if (s.billingCycle === "monthly") {
            isDueThisMonth = true;
          } else if (s.billingCycle === "quarterly") {
            const diffMonths = (year - subDate.getFullYear()) * 12 + (month - subDate.getMonth());
            isDueThisMonth = diffMonths >= 0 && diffMonths % 3 === 0;
          } else if (s.billingCycle === "yearly") {
            const diffMonths = (year - subDate.getFullYear()) * 12 + (month - subDate.getMonth());
            isDueThisMonth = diffMonths >= 0 && diffMonths % 12 === 0;
          } else {
            isDueThisMonth = subDate.getFullYear() === year && subDate.getMonth() === month;
          }

          if (isDueThisMonth) {
            const targetDay = Math.min(subDay, daysInMonth);
            dueDays[targetDay] = (dueDays[targetDay] || []).concat({
              label: s.name,
              color: THEME.gold,
              amount: Number(s.amount || 0),
              amountLabel: "Amount",
              frequency:
                s.billingCycle === "monthly"
                  ? "Monthly"
                  : s.billingCycle === "quarterly"
                    ? "Quarterly"
                    : s.billingCycle === "yearly"
                      ? "Annual"
                      : "One-time",
              type: "subscription",
            });
          }
        }
      });

    // 3. ADVANCE TAX (15th of Jun, Sep, Dec, Mar)
    if (month === 5 || month === 8 || month === 11 || month === 2)
      dueDays[15] = (dueDays[15] || []).concat({
        label: "Adv. Tax",
        color: THEME.violet,
        frequency: "Quarterly",
        type: "tax",
      });

    // 4. LIC PREMIUMS: recurring logic by anniversary month and active range
    (state.lic || []).forEach((l: any) => {
      if (l.commencementDate) {
        const commDate = new Date(l.commencementDate + "T00:00:00");
        if (!isNaN(commDate.getTime())) {
          const commYear = commDate.getFullYear();
          const commMonth = commDate.getMonth();

          // Viewed year/month must be >= commencement year/month
          if (year > commYear || (year === commYear && month >= commMonth)) {
            let isMatured = false;
            if (l.maturityDate) {
              const matDate = new Date(l.maturityDate + "T00:00:00");
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
                amount: Number(l.annualPremium || l.premium || 0),
                amountLabel: "Premium",
                frequency: "Annual",
                type: "insurance",
              });
            }
          }
        }
      }
    });

    // 5. TERM PLAN PREMIUMS: recurring logic by anniversary month and active range
    (state.termPlans || []).forEach((t: any) => {
      if (t.startDate) {
        const commDate = new Date(t.startDate + "T00:00:00");
        if (!isNaN(commDate.getTime())) {
          const commYear = commDate.getFullYear();
          const commMonth = commDate.getMonth();

          // Viewed year/month must be >= commencement year/month
          if (year > commYear || (year === commYear && month >= commMonth)) {
            let isExpired = false;
            if (t.expiryDate) {
              const expDate = new Date(t.expiryDate + "T00:00:00");
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
                amount: Number(t.annualPremium || t.premium || 0),
                amountLabel: "Premium",
                frequency: "Annual",
                type: "insurance",
              });
            }
          }
        }
      }
    });

    // 6. INVESTMENT PLAN PREMIUMS: recurring logic by anniversary month and active range
    (state.investmentPlans || []).forEach((ip: any) => {
      if (ip.commencementDate) {
        const commDate = new Date(ip.commencementDate + "T00:00:00");
        if (!isNaN(commDate.getTime())) {
          const commYear = commDate.getFullYear();
          const commMonth = commDate.getMonth();

          // Viewed year/month must be >= commencement year/month
          if (year > commYear || (year === commYear && month >= commMonth)) {
            let isMatured = false;
            if (ip.maturityDate) {
              const matDate = new Date(ip.maturityDate + "T00:00:00");
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
                amount: Number(ip.annualPremium || ip.premium || 0),
                amountLabel: "Premium",
                frequency: "Annual",
                type: "investmentPlan",
              });
            }
          }
        }
      }
    });

    // 7. RENTED PROPERTIES: monthly rent due day within active agreement range (paid vs unpaid status coloring)
    (state.rentedProperties || [])
      .filter((p: any) => p.isActive !== false && getEffectiveRent(p) > 0)
      .forEach((p: any) => {
        let isAgreementActive = true;
        if (p.agreementStart) {
          const start = new Date(p.agreementStart + "T00:00:00");
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
          const end = new Date(p.agreementEnd + "T00:00:00");
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
              label: p.propertyName || "Rent",
              color: isPaid ? THEME.sage : THEME.gold,
              amount: getEffectiveRent(p),
              amountLabel: "Rent",
              frequency: "Monthly",
              paid: isPaid,
              type: "rent",
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
            amount: fdMaturity(
              Number(f.principal || 0),
              Number(f.rate || 0),
              Number(f.years || 0)
            ),
            amountLabel: "Maturity Value",
            frequency: "One-time",
            type: "fdMaturity",
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
        if (year < sipStartYear || (year === sipStartYear && month < sipStartMonth)) return;
        const sipDay = sipStart.getDate();
        const targetDay = Math.min(sipDay, daysInMonth);
        dueDays[targetDay] = (dueDays[targetDay] || []).concat({
          label: `SIP: ${s.scheme || s.fund || "Fund"}`,
          color: THEME.accent,
          amount: Number(s.amount || 0),
          amountLabel: "SIP Amount",
          frequency: "Monthly",
          type: "sip",
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
          amount: Number(l.emi || 0),
          amountLabel: "EMI",
          frequency: "Monthly",
          type: "loanEmi",
        });
      });

    return dueDays;
  }, [
    calendarDate,
    state.creditCards,
    state.subscriptions,
    state.lic,
    state.termPlans,
    state.investmentPlans,
    state.rentedProperties,
    state.fixedDeposits,
    state.sips,
    state.loansTaken,
  ]);

  const fireData = useMemo(() => {
    const annualExpense = metrics.monthExpense * 12;
    const fireCorpus = computeFireTarget(annualExpense);
    const progress =
      fireCorpus > 0 ? Math.min((Math.max(metrics.netWorth, 0) / fireCorpus) * 100, 100) : 0;
    return { fireCorpus, progress, annualExpense };
  }, [metrics.monthExpense, metrics.netWorth]);

  const passiveIncomeData = useMemo(() => {
    const rentalMonthly = (state.rentalProperties || []).reduce(
      (s: number, r: any) => s + getEffectiveRent(r),
      0
    );

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
    const bondMonthly = ((metrics.bondValue || 0) * 0.07) / 12;

    const govtRates: Record<string, number> = {
      SSY: 8.2,
      SCSS: 8.2,
      NSC: 7.7,
      KVP: 7.5,
      POST_MIS: 7.4,
      RBI_BOND: 8.05,
      NPS_LITE: 7.0,
    };
    const govtSchemesMonthly = (state.govtSchemes || []).reduce((sum: number, sc: any) => {
      const rate = Number(sc.interestRate) || govtRates[sc.schemeType] || 0;
      const balance = Number(sc.currentBalance || 0);
      return sum + (balance * rate) / 100 / 12;
    }, 0);

    const totalPassive =
      rentalMonthly +
      fdMonthly +
      rdMonthly +
      bondMonthly +
      govtSchemesMonthly +
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
    state.govtSchemes,
    metrics.cashInBanks,
    metrics.stockValue,
    metrics.mfValue,
    metrics.bondValue,
    metrics.monthIncome,
  ]);

  const taxData80C = useMemo(() => {
    const limit = 150000;
    const fyParts = (getCurrentFY() || "").split("-");
    const fyStartYear = Number(fyParts[0]) || new Date().getFullYear() - 1;
    const fyStartStr = `${fyStartYear}-04-01`;
    const fyEndStr = `${fyStartYear + 1}-03-31`;
    const elss = (state.mutualFunds || [])
      .filter(
        (m: any) =>
          (m.type || m.category || "").toUpperCase().includes("ELSS") &&
          m.buyDate &&
          m.buyDate >= fyStartStr &&
          m.buyDate <= fyEndStr
      )
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
            (s: number, p: any) => s + Number(p.thisYearContribution || p.yearlyContribution || 0),
            0
          );
    const licPremium = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.annualPremium || 0),
      0
    );
    const epfEmployee = (state.epf || []).reduce((s: number, e: any) => {
      const txs = (e.transactions || []).filter(
        (t: any) => t.date && t.date >= fyStartStr && t.date <= fyEndStr
      );
      const simpleEmp = txs
        .filter((t: any) => t.type === "employee_contribution")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const passbookEmp = txs
        .filter((t: any) => t.type === "monthly_contribution")
        .reduce((sum: number, t: any) => sum + Number(t.employeeShare || 0), 0);
      const ledgerTotal = simpleEmp + passbookEmp;
      return s + (ledgerTotal > 0 ? ledgerTotal : Number(e.thisYearContribution || 0));
    }, 0);
    // NPS employee contribution qualifies under 80CCD(1) within the ₹1.5L limit
    const npsContrib = (state.nps || []).reduce(
      (s: number, n: any) => s + Number(n.yearContribution || n.yearlyContribution || 0),
      0
    );
    const total = Math.min(elss + ppfAnnual + licPremium + epfEmployee + npsContrib, limit);
    const remaining = Math.max(0, limit - total);
    return {
      elss,
      ppfAnnual,
      licPremium,
      epfEmployee,
      npsContrib,
      total,
      remaining,
      limit,
      progress: total > 0 ? (total / limit) * 100 : 0,
    };
  }, [state.mutualFunds, state.ppf, state.ppfLedger, state.lic, state.epf, state.nps, getCurrentFY()]);

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
        label: `${privacyMode ? "••••" : fmtINRFull(Math.max(0, nw))} of ${privacyMode ? "••••" : fmtINRFull(nextNW[1])}`,
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

    // Safety Net — same metrics.emergencyFund figure as the dashboard widget and
    // dedicated tab (see comment on emergencyMonths above).
    const efM = metrics.emergencyFund.monthsCovered;
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
      (s: number, sip: any) =>
        s + (sip.frequency === "quarterly" ? Number(sip.amount || 0) / 3 : Number(sip.amount || 0)),
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
        label: `${privacyMode ? "••••" : fmtINRFull(totalSIPAmt)} of ${privacyMode ? "••••" : fmtINRFull(5000)}/mo`,
      };

    // Debt Smart — matches metrics.foir's active-loan filter
    const activeLoans = (state.loansTaken || []).filter(
      (l: any) => Number(l.outstanding || 0) > 0 && Number(l.monthsRemaining ?? 1) > 0
    );
    const totalEMI = activeLoans.reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    const foirPct = metrics.monthIncome > 0 ? (totalEMI / metrics.monthIncome) * 100 : 0;
    if (metrics.monthIncome > 0 && foirPct < 40) earned.add("d40");
    if (metrics.monthIncome > 0 && foirPct < 20) earned.add("d20");
    if (metrics.totalLiabilities === 0 && metrics.netWorth >= 0) earned.add("df");

    // Credit Smart — deduplicate shared-pool limits (consistent with useMetrics)
    const activeCC = (state.creditCards || []).filter(
      (c: any) => (c.status || "").toLowerCase() !== "closed"
    );
    const ccOut = activeCC.reduce((s: number, c: any) => s + Number(c.outstanding || 0), 0);
    const ccGroupPoolsBadge: Record<string, number> = {};
    activeCC.forEach((c: any) => {
      if (c.sharedGroup) {
        ccGroupPoolsBadge[c.sharedGroup] = Math.max(
          ccGroupPoolsBadge[c.sharedGroup] || 0,
          Number(c.sharedGroupLimit) || 0
        );
      }
    });
    const ccLim =
      activeCC
        .filter((c: any) => !c.sharedGroup)
        .reduce((s: number, c: any) => s + Number(c.limit || 0), 0) +
      (Object.values(ccGroupPoolsBadge) as number[]).reduce((s: number, v: number) => s + v, 0);
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
    const fyParts80C = (getCurrentFY() || "").split("-");
    const fyStart80C = Number(fyParts80C[0]) || new Date().getFullYear() - 1;
    const fyStartStr80C = `${fyStart80C}-04-01`;
    const fyEndStr80C = `${fyStart80C + 1}-03-31`;
    const elss80C = (state.mutualFunds || [])
      .filter(
        (m: any) =>
          (m.type || m.category || "").toUpperCase().includes("ELSS") &&
          m.buyDate &&
          m.buyDate >= fyStartStr80C &&
          m.buyDate <= fyEndStr80C
      )
      .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);
    const ppf80C =
      (state.ppfLedger || [])
        .filter(
          (t: any) =>
            t.date && t.date >= fyStartStr80C && t.date <= fyEndStr80C && t.type !== "withdrawal"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0) ||
      (state.ppf || []).reduce(
        (s: number, p: any) => s + Number(p.thisYearContribution || p.yearlyContribution || 0),
        0
      );
    const lic80C = (state.lic || []).reduce(
      (s: number, l: any) => s + Number(l.annualPremium || 0),
      0
    );
    const epf80C = (state.epf || []).reduce((s: number, e: any) => {
      const txs80 = (e.transactions || []).filter(
        (t: any) => t.date && t.date >= fyStartStr80C && t.date <= fyEndStr80C
      );
      const simpleEmp80 = txs80
        .filter((t: any) => t.type === "employee_contribution")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const passbookEmp80 = txs80
        .filter((t: any) => t.type === "monthly_contribution")
        .reduce((sum: number, t: any) => sum + Number(t.employeeShare || 0), 0);
      const lTotal = simpleEmp80 + passbookEmp80;
      return s + (lTotal > 0 ? lTotal : Number(e.thisYearContribution || 0));
    }, 0);
    const nps80C = (state.nps || []).reduce(
      (s: number, n: any) => s + Number(n.yearContribution || n.yearlyContribution || 0),
      0
    );
    const total80C = Math.min(elss80C + ppf80C + lic80C + epf80C + nps80C, 150000);
    if (total80C >= 150000) earned.add("tax2");
    if (!earned.has("tax1"))
      prog["tax1"] = { current: 0, target: 1, label: "Add a PPF/ELSS/NPS/LIC investment" };
    else if (!earned.has("tax2"))
      prog["tax2"] = {
        current: total80C,
        target: 150000,
        label: `${privacyMode ? "••••" : fmtINRFull(total80C)} of ${privacyMode ? "••••" : fmtINRFull(150000)} invested`,
      };

    // Passive Income (rent + estimated FD/bond interest)
    const rentalPassive = (state.rentalProperties || []).reduce(
      (s: number, r: any) => s + getEffectiveRent(r),
      0
    );
    const fdPassive = (state.fixedDeposits || []).reduce(
      (s: number, f: any) => s + (Number(f.principal || 0) * Number(f.rate || 0)) / 100 / 12,
      0
    );
    const bondPassive = ((metrics.bondValue || 0) * 0.07) / 12;
    const rdPassive = (state.recurringDeposits || []).reduce((sum: number, r: any) => {
      const start = r.startDate ? new Date(r.startDate) : new Date();
      const now = new Date();
      const m =
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const months = Math.max(0, Math.min(m, Number(r.tenureMonths || 0)));
      const currentVal =
        months > 0 ? rdMaturity(Number(r.monthly || 0), Number(r.rate || 6), months) : 0;
      return sum + (currentVal * Number(r.rate || 6)) / 100 / 12;
    }, 0);
    const savPassive = (metrics.cashInBanks * 0.03) / 12;
    const divPassive =
      ((metrics.stockValue || 0) * 0.012) / 12 + ((metrics.mfValue || 0) * 0.01) / 12;
    const govtRates: Record<string, number> = {
      SSY: 8.2,
      SCSS: 8.2,
      NSC: 7.7,
      KVP: 7.5,
      POST_MIS: 7.4,
      RBI_BOND: 8.05,
      NPS_LITE: 7.0,
    };
    const govtSchemesPassive = (state.govtSchemes || []).reduce((sum: number, sc: any) => {
      const rate = Number(sc.interestRate) || govtRates[sc.schemeType] || 0;
      const balance = Number(sc.currentBalance || 0);
      return sum + (balance * rate) / 100 / 12;
    }, 0);
    const totalPassiveMonthly =
      rentalPassive +
      fdPassive +
      rdPassive +
      bondPassive +
      savPassive +
      divPassive +
      govtSchemesPassive;
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
        label: `${privacyMode ? "••••" : fmtINRFull(Math.round(totalPassiveMonthly))}/mo of ${privacyMode ? "••••" : fmtINRFull(nextPI[1])}/mo`,
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

    // FOIR for peer benchmarking — matches metrics.foir's active-loan filter
    const activeLoansHB = (state.loansTaken || []).filter(
      (l: any) => Number(l.outstanding || 0) > 0 && Number(l.monthsRemaining ?? 1) > 0
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
    const efMonthsHB = Math.min(12, metrics.emergencyFund.monthsCovered);

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
  }, [metrics, dashboardData.streak, state, privacyMode]);

  // ── Streak calendar: January to December of current year ──
  const streakCalendar = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(currentYear, i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txns = (state.transactions || []).filter((t: any) => t.date && t.date.startsWith(ym));
      const explicitInc = (state.income || [])
        .filter((inc: any) => inc.date && inc.date.startsWith(ym))
        .reduce((s: number, inc: any) => s + Number(inc.amount || 0), 0);
      const txnInc = txns
        .filter(
          (t: any) =>
            t.type === "credit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const inc = explicitInc > 0 ? explicitInc : txnInc;
      const txnExp = txns
        .filter(
          (t: any) =>
            t.type === "debit" &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer" &&
            t.category !== "Investment"
        )
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const rentExp = (state.rentedProperties || []).reduce((sum: number, p: any) => {
        return (
          sum +
          (p.payments || [])
            .filter((pay: any) => pay.date && pay.date.startsWith(ym))
            .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0)
        );
      }, 0);
      const exp = txnExp + rentExp;
      // The current month is still in progress — dashboardData.streak (above)
      // deliberately excludes it from streak counting, so this calendar must
      // match that and show it as "no data yet" rather than a premature
      // green/red verdict on incomplete data.
      const isCurrentMonth = d.getFullYear() === now.getFullYear() && i === now.getMonth();
      const hasData = !isCurrentMonth && (txns.length > 0 || inc > 0);
      return {
        label: d.toLocaleString("en-IN", { month: "short" }),
        year: d.getFullYear(),
        saved: hasData && inc > exp && inc > 0,
        hasData,
        isCurrentMonth,
        rate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
      };
    });
  }, [state.transactions, state.income, state.rentedProperties]);

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
      (state.sips || []).reduce(
        (sum: number, s: any) =>
          sum + (s.frequency === "quarterly" ? Number(s.amount || 0) / 3 : Number(s.amount || 0)),
        0
      ) + fireWhatIfExtra;
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
      fireTarget: computeFireTarget(annualExpense),
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
      const fireTarget = computeFireTarget(annualExpense, y, DEFAULT_FIRE_SWR, inflationRate);

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
      .filter(
        (t: any) =>
          t.type === "credit" &&
          t.date &&
          new Date(t.date) >= fyStart2 &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const annualizedCurrentMonth = (metrics?.monthIncome || 0) * 12;
    // Correct priority: explicit ledger → FY-to-date txns → annualised current month
    const annualIncome = explicitIncome || txnIncome || annualizedCurrentMonth || 0;

    const totalTermCover = (state.termPlans || []).reduce(
      (s: number, t: any) => s + Number(t.coverAmount || 0),
      0
    );
    // 10× annual income — matches "Protected" badge criterion and Family Dashboard
    const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
    // Same metrics.emergencyFund figure as the Emergency Fund Health card.
    const emergencyMonths = metrics.emergencyFund.monthsCovered;

    if (metrics.monthIncome > 0 && metrics.savingsRate < 10)
      insights.push({
        icon: AlertTriangle,
        title: "Low Savings Rate",
        value: `${metrics.savingsRate.toFixed(0)}% · target 20%+`,
        color: THEME.rust,
        bg: `color-mix(in srgb, var(--t-rust) 7%, transparent)`,
      });
    else if (metrics.savingsRate >= 30)
      insights.push({
        icon: Flame,
        title: "Strong Savings Rate",
        value: `${metrics.savingsRate.toFixed(0)}% this month`,
        color: THEME.sage,
        bg: `color-mix(in srgb, var(--t-sage) 7%, transparent)`,
      });

    if (metrics.emergencyFund.monthlyExpense > 0 && emergencyMonths < 3)
      insights.push({
        icon: ShieldAlert,
        title: "Emergency Fund",
        value: `${emergencyMonths.toFixed(1)} mo liquid · need 3+`,
        color: THEME.rust,
        bg: `color-mix(in srgb, var(--t-rust) 7%, transparent)`,
      });
    else if (emergencyMonths >= 3 && emergencyMonths < 6)
      insights.push({
        icon: ShieldAlert,
        title: "Emergency Fund",
        value: `${emergencyMonths.toFixed(1)} mo — building toward 6`,
        color: THEME.gold,
        bg: `color-mix(in srgb, var(--t-gold) 7%, transparent)`,
      });
    else if (emergencyMonths >= 6)
      insights.push({
        icon: ShieldAlert,
        title: "Emergency Fund",
        value: `${emergencyMonths.toFixed(1)} mo — solid cover`,
        color: THEME.sage,
        bg: `color-mix(in srgb, var(--t-sage) 7%, transparent)`,
      });

    if (annualIncome > 0 && coverRatio < 10)
      insights.push({
        icon: AlertTriangle,
        title: "Insurance Gap",
        value: `${fmtINRFull(annualIncome * 10 - totalTermCover)} short of 10× cover`,
        money: true,
        color: THEME.gold,
        bg: `color-mix(in srgb, var(--t-gold) 7%, transparent)`,
      });

    if (metrics.debtToAssetRatio > 40)
      insights.push({
        icon: AlertTriangle,
        title: "High Debt Ratio",
        value: `${metrics.debtToAssetRatio.toFixed(0)}% of total assets`,
        color: THEME.rust,
        bg: `color-mix(in srgb, var(--t-rust) 7%, transparent)`,
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
        bg: `color-mix(in srgb, var(--t-gold) 7%, transparent)`,
      });

    if ((state.sips || []).length === 0 && metrics.monthIncome > 0)
      insights.push({
        icon: Zap,
        title: "No Active SIPs",
        value: "Consider starting a monthly mutual fund SIP",
        color: THEME.accent,
        bg: `color-mix(in srgb, var(--t-accent) 7%, transparent)`,
      });

    // FOIR: Fixed Obligation to Income Ratio — healthy lending threshold is <40%
    // Only count active loans (same filter as metrics.foir) to stay consistent with the FOIR tile
    const totalEMISmart = (state.loansTaken || [])
      .filter((l: any) => Number(l.outstanding || 0) > 0 && Number(l.monthsRemaining ?? 1) > 0)
      .reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    if (metrics.monthIncome > 0 && totalEMISmart > 0) {
      const foirPct = (totalEMISmart / metrics.monthIncome) * 100;
      if (foirPct > 50)
        insights.push({
          icon: AlertTriangle,
          title: "EMI Burden Critical",
          value: `${foirPct.toFixed(0)}% FOIR — reduce debt urgently`,
          color: THEME.rust,
          bg: `color-mix(in srgb, var(--t-rust) 7%, transparent)`,
        });
      else if (foirPct > 40)
        insights.push({
          icon: AlertTriangle,
          title: "High EMI Burden",
          value: `${foirPct.toFixed(0)}% FOIR · keep under 40%`,
          color: THEME.gold,
          bg: `color-mix(in srgb, var(--t-gold) 7%, transparent)`,
        });
    }

    // Credit card utilization — above 30% can hurt credit score
    if (metrics.totalCCLimit > 0 && metrics.ccOutstanding > 0) {
      const utilPct = metrics.creditUtilization;
      if (utilPct > 50)
        insights.push({
          icon: AlertTriangle,
          title: "High Credit Utilization",
          value: `${utilPct.toFixed(0)}% used · aim for below 30%`,
          color: THEME.rust,
          bg: `color-mix(in srgb, var(--t-rust) 7%, transparent)`,
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
          const rate = Number(l.rate || l.interestRate || 0) / 12 / 100;
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
          value: `${fmtINRFull(soonest.outstanding)} remaining · ${withMonths.length} active loan${withMonths.length > 1 ? "s" : ""}`,
          money: true,
          color: THEME.accent,
          bg: `color-mix(in srgb, var(--t-accent) 7%, transparent)`,
        });
      }
    }

    // Expense anomaly: flag any category where this month is 50%+ above its 3-month average
    if (metrics.monthExpense > 0) {
      const now3 = new Date();
      const currentYm = `${now3.getFullYear()}-${String(now3.getMonth() + 1).padStart(2, "0")}`;
      // Build per-month category totals for the previous 3 months, then average those
      // monthly totals (not individual transaction amounts) to avoid skew from transaction count
      const prev3Map: Record<string, number[]> = {};
      for (let m = 1; m <= 3; m++) {
        const d3 = new Date(now3.getFullYear(), now3.getMonth() - m, 1);
        const ym3 = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, "0")}`;
        const monthTotals: Record<string, number> = {};
        (state.transactions || [])
          .filter(
            (t: any) =>
              t.type === "debit" &&
              t.date &&
              t.date.startsWith(ym3) &&
              t.category !== "Transfer" &&
              t.category !== "Self Transfer" &&
              t.category !== "Self-Transfer" &&
              t.category !== "Investment"
          )
          .forEach((t: any) => {
            const cat = t.category || "Uncategorized";
            monthTotals[cat] = (monthTotals[cat] || 0) + Number(t.amount || 0);
          });
        for (const [cat, total] of Object.entries(monthTotals)) {
          if (!prev3Map[cat]) prev3Map[cat] = [];
          prev3Map[cat].push(total);
        }
      }
      const currentCatMap: Record<string, number> = {};
      (state.transactions || [])
        .filter(
          (t: any) =>
            t.type === "debit" &&
            t.date &&
            t.date.startsWith(currentYm) &&
            t.category !== "Transfer" &&
            t.category !== "Self Transfer" &&
            t.category !== "Self-Transfer" &&
            t.category !== "Investment"
        )
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
          value: `${fmtINRFull(topVal)} this month vs ${fmtINRFull(avg3)} avg — ${Math.round((topVal / avg3 - 1) * 100)}% above normal`,
          money: true,
          color: THEME.gold,
          bg: `color-mix(in srgb, var(--t-gold) 7%, transparent)`,
        });
      }
    }

    // SIP affordability: flag if total SIP > monthly savings
    const totalSIPAmtSmart = (state.sips || []).reduce(
      (s: number, sip: any) =>
        s + (sip.frequency === "quarterly" ? Number(sip.amount || 0) / 3 : Number(sip.amount || 0)),
      0
    );
    if (totalSIPAmtSmart > 0 && metrics.monthIncome > 0) {
      const monthlySavings = metrics.monthIncome - metrics.monthExpense;
      if (totalSIPAmtSmart > monthlySavings && monthlySavings < totalSIPAmtSmart * 0.9) {
        insights.push({
          icon: AlertTriangle,
          title: "SIP Exceeds Savings",
          value: `SIPs ${fmtINRFull(totalSIPAmtSmart)}/mo · only ${fmtINRFull(Math.max(0, monthlySavings))} available`,
          money: true,
          color: THEME.rust,
          bg: `color-mix(in srgb, var(--t-rust) 7%, transparent)`,
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
        value: `${fmtINRFull(Math.round(ccInterestMonthly))}/mo in charges if balances not cleared`,
        money: true,
        color: THEME.rust,
        bg: `color-mix(in srgb, var(--t-rust) 7%, transparent)`,
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
        ? `${fmtINRFull(Math.round(totalAnnualFees / 12))}/mo · ${pctOfIncome}% of annual income`
        : `${fmtINRFull(Math.round(totalAnnualFees / 12))}/mo across ${feeCardCount} card${feeCardCount !== 1 ? "s" : ""}`;
      insights.push({
        icon: CreditCard,
        title: "CC Annual Fees",
        value: `${fmtINRFull(totalAnnualFees)}/yr · ${sub}`,
        money: true,
        color: THEME.gold,
        bg: `color-mix(in srgb, var(--t-gold) 7%, transparent)`,
      });
    }

    if (insights.length === 0 && metrics.netWorth > 0)
      insights.push({
        icon: Flame,
        title: "All Clear",
        value: "Your finances are on a healthy track",
        color: THEME.sage,
        bg: `color-mix(in srgb, var(--t-sage) 7%, transparent)`,
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
    state.fixedDeposits,
  ]);

  const ytdData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let labelStart: string;

    if (ytdMode === "fy") {
      const fyParts = (getCurrentFY() || "").split("-");
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
      .filter(
        (t: any) =>
          t.type === "credit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    // Income ledger is the authoritative source (mirrors App.tsx explicitIncome priority)
    const ytdIncomeLedger = (state.income || [])
      .filter((i: any) => i.date && i.date >= startStr)
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const ytdIncome = ytdIncomeLedger > 0 ? ytdIncomeLedger : ytdTxnIncome;
    const ytdTxnExpense = ytdTxns
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer" &&
          t.category !== "Investment"
      )
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
  }, [state.transactions, state.income, state.rentedProperties, getCurrentFY(), ytdMode]);

  const goalHealth = useMemo(() => {
    const now = new Date();
    const monthlySavings = Math.max(0, metrics.monthIncome - metrics.monthExpense);
    const computed = (state.goals || []).map((g: any) => {
      const targetAmount = Number(g.targetAmount || g.target || 0);
      const savedAmount = Number(g.savedAmount || g.currentAmount || g.saved || 0);
      const gap = Math.max(0, targetAmount - savedAmount);
      const progress = targetAmount > 0 ? Math.min((savedAmount / targetAmount) * 100, 100) : 0;
      const targetDate = g.targetDate || g.deadline;
      let monthsLeft = 0,
        monthlyNeeded = 0;
      if (targetDate) {
        const td = new Date(targetDate);
        monthsLeft = Math.max(0, Math.ceil((td.getTime() - now.getTime()) / (30 * 86400000)));
        monthlyNeeded = monthsLeft > 0 ? gap / monthsLeft : gap;
      }
      const achieved = gap === 0;
      return {
        ...g,
        gap,
        monthsLeft,
        monthlyNeeded,
        progress,
        targetAmount,
        savedAmount,
        achieved,
      };
    });
    // Combined monthly need across ALL active goals — a goal can look affordable
    // in isolation while the household can't actually fund every goal at once.
    const totalMonthlyNeeded = computed
      .filter((g) => !g.achieved && g.monthsLeft > 0)
      .reduce((sum, g) => sum + g.monthlyNeeded, 0);
    const combinedShortfall = Math.max(0, totalMonthlyNeeded - monthlySavings);
    return computed.map((g) => ({
      ...g,
      totalMonthlyNeeded,
      combinedShortfall,
      onTrack: !g.achieved && g.monthsLeft > 0 && monthlySavings >= totalMonthlyNeeded,
    }));
  }, [state.goals, metrics.monthIncome, metrics.monthExpense]);

  const isPositive = metrics.netWorth >= 0;
  const animatedMonthIncome = useAnimatedNumber(metrics.monthIncome || 0);
  const animatedMonthExpense = useAnimatedNumber(metrics.monthExpense || 0);
  const animatedTaxDue = useAnimatedNumber(metrics.taxDue || 0);
  const animatedMomDelta = useAnimatedNumber(momNetWorthDelta?.delta ?? 0);
  const animatedYtdIncome = useAnimatedNumber(ytdData.ytdIncome || 0);
  const animatedYtdExpense = useAnimatedNumber(ytdData.ytdExpense || 0);
  const animatedYtdSavings = useAnimatedNumber(ytdData.ytdSavings || 0);

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
            value: <Money value={animatedNetWorth} variant="full" />,
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
            value: <Money value={animatedMonthIncome} variant="full" />,
            color: THEME.sage,
            Icon: ArrowUpRight,
          },
          {
            label: "Monthly Spend",
            value: <Money value={animatedMonthExpense} variant="full" />,
            color: THEME.rust,
            Icon: Receipt,
          },
          {
            label: "Est. Tax",
            value: <Money value={animatedTaxDue} variant="full" />,
            color: metrics.taxDue > 0 ? THEME.rust : THEME.sage,
            Icon: Landmark,
          },
          ...(momNetWorthDelta
            ? [
                {
                  label: momNetWorthDelta.label,
                  value: (
                    <>
                      {animatedMomDelta >= 0 ? "+" : ""}
                      <Money value={animatedMomDelta} variant="full" />
                    </>
                  ),
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
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <Icon size={17} color={color} />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.08em",
                      lineHeight: 1.3,
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
          marginBottom: 8,
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
                aria-pressed={sub === s.id}
              >
                <Icon size={14} />
                {s.label}
              </button>
            );
          })}
        </div>
        <div style={{ flexShrink: 0, display: "flex", gap: 6, marginLeft: "auto" }}>
          {sub === "dashboard" && (
            <button
              onClick={() => setShowWidgetConfig(!showWidgetConfig)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 10,
                border: `1.5px solid ${showWidgetConfig ? THEME.accent : THEME.line}`,
                background: showWidgetConfig
                  ? `color-mix(in srgb, var(--t-accent) 10%, transparent)`
                  : "transparent",
                color: showWidgetConfig ? THEME.accent : THEME.muted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!showWidgetConfig) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.accent;
                  (e.currentTarget as HTMLButtonElement).style.color = THEME.ink;
                }
              }}
              onMouseLeave={(e) => {
                if (!showWidgetConfig) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.line;
                  (e.currentTarget as HTMLButtonElement).style.color = THEME.muted;
                }
              }}
            >
              <Settings size={13} /> Widgets
            </button>
          )}
          <button
            onClick={() => setShowReport(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              border: `1.5px solid ${THEME.line}`,
              background: "transparent",
              color: THEME.muted,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.accent;
              (e.currentTarget as HTMLButtonElement).style.color = THEME.ink;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.line;
              (e.currentTarget as HTMLButtonElement).style.color = THEME.muted;
            }}
          >
            <Printer size={13} /> Report
          </button>
        </div>
      </div>

      {/* Active sub-tab breadcrumb / description */}
      {(() => {
        const descriptions: Record<string, string> = {
          dashboard: "Executive overview · Net worth, health score, cash flow & portfolio vitals",
          trends: "Historical charts · Net worth growth, P&L, savings rate & portfolio returns",
          allocation: "Asset distribution · Diversification, concentration risk & sector breakdown",
          planning: "Goals & milestones · Loan tracker, retirement planner & financial targets",
          spending: "Budget analysis · Monthly category breakdown, top expenses & spending trends",
          calendar: "Scheduled events · Upcoming EMIs, renewals, dues & financial milestones",
          habits: "Streaks & rewards · Financial discipline tracking and achievement badges",
        };
        const desc = descriptions[sub];
        if (!desc) return null;
        const ActiveIcon = subs.find((s) => s.id === sub)?.icon;
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
              padding: "6px 0",
              borderBottom: `1px solid ${THEME.line}`,
            }}
          >
            {ActiveIcon && (
              <span style={{ color: THEME.accent, display: "flex", alignItems: "center" }}>
                <ActiveIcon size={13} />
              </span>
            )}
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 500 }}>{desc}</span>
          </div>
        );
      })()}

      {/* Widget Configuration Panel */}
      {showWidgetConfig && sub === "dashboard" && (
        <Card>
          <div style={{ padding: 16, marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                Customize Dashboard Widgets
              </div>
              <button
                onClick={() => setShowWidgetConfig(false)}
                aria-label="Close widget settings"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: THEME.muted,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12 }}>
              Toggle widgets on/off to personalize your dashboard view.
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(var(--grid-min-md), 1fr))",
                gap: 8,
              }}
            >
              {DASHBOARD_WIDGET_DEFS.map((w) => {
                const isVisible = dashboardWidgets?.[w.key] !== false;
                return (
                  <button
                    key={w.key}
                    role="checkbox"
                    aria-checked={isVisible}
                    aria-label={`${w.label}: ${isVisible ? "visible" : "hidden"}`}
                    onClick={() => {
                      const updated = { ...(dashboardWidgets || {}), [w.key]: !isVisible };
                      onUpdateWidgets?.(updated);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      textAlign: "left",
                      border: `1.5px solid ${isVisible ? THEME.accent : THEME.line}`,
                      background: isVisible
                        ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)`
                        : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `2px solid ${isVisible ? THEME.accent : THEME.line}`,
                        background: isVisible ? THEME.accent : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: THEME.darkInk,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {isVisible ? "✓" : ""}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isVisible ? THEME.ink : THEME.muted,
                      }}
                    >
                      {w.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ────────────────── SUB-TAB: DASHBOARD ────────────────── */}
      {sub === "dashboard" && (
        <div key="dashboard" className="tab-content-enter">
          {/* Welcome Banner Card */}
          <Card
            variant="base"
            style={{
              padding: "20px 24px",
              background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.accent} 3%, transparent), color-mix(in srgb, ${THEME.sage} 3%, transparent))`,
              border: `1.5px solid ${THEME.line}`,
              borderRadius: 16,
              marginBottom: 20,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                    {activeProfile === "all"
                      ? "Family Wealth Overview"
                      : `${
                          familyProfiles.find((p) => p.id === activeProfile)?.name || activeProfile
                        }'s Portfolio`}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4, fontWeight: 500 }}>
                  Here is the consolidated summary of your{" "}
                  {activeProfile === "all"
                    ? "family wealth portfolios"
                    : `${familyProfiles.find((p) => p.id === activeProfile)?.name}'s portfolio`}
                  .
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  alignItems: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {(() => {
                  // Real freshness check on the live market-price cache, replacing a
                  // hardcoded "System Online" claim that stayed green even when
                  // prices had never loaded or the fetch had failed hours ago.
                  if (!marketDataTs) {
                    return (
                      <span style={{ fontSize: 12, fontWeight: 800, color: THEME.muted }}>
                        ● Prices not loaded
                      </span>
                    );
                  }
                  const diffMin = Math.floor((Date.now() - marketDataTs) / 60000);
                  const isStale = diffMin > 8 * 60;
                  const label =
                    diffMin < 1
                      ? "Updated just now"
                      : diffMin < 60
                        ? `Updated ${diffMin}m ago`
                        : diffMin < 8 * 60
                          ? `Updated ${Math.floor(diffMin / 60)}h ago`
                          : "Prices stale";
                  return (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: isStale ? THEME.rust : THEME.sage,
                      }}
                    >
                      ● {label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </Card>

          {dashboardWidgets?.["smartInsights"] !== false && smartInsights.length > 0 && (
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
                    borderRadius: "var(--radius-xs)",
                    background: smartInsights.some((ins: any) => ins.color === THEME.rust)
                      ? `color-mix(in srgb, var(--t-rust) 12%, transparent)`
                      : `color-mix(in srgb, var(--t-gold) 12%, transparent)`,
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
                        border: `1px solid color-mix(in srgb, ${ins.color} 16%, transparent)`,
                        borderLeft: `3px solid ${ins.color}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                        <Icon size={19} color={ins.color} />
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
                          {ins.money ? maskCurrencyInText(ins.value, privacyMode) : ins.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="animate-fade-in-up bento-grid">
            {(dashboardWidgets?.["coreWealthVitals"] !== false) && (
              <>
            <DashboardSectionHeader
              title="Core Wealth & Vitals"
              desc="Consolidated net worth summary, asset breakdown, and core health indexes."
              icon={<TrendingUp size={16} />}
            />
            {/* Hero Card */}
            <Card
              variant="hero"
              className="bento-col-12"
              style={{
                padding: "32px 40px",
                background: isDark ? "var(--surface-2)" : "#0F172A",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
                border: isDark ? `1px solid ${THEME.line}` : "none",
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

              {netWorthTrend.filter((t: any) => t.value > 0).length >= 2 && (
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
                  <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                  </ResponsiveContainer></div>
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
                      background: "#C5A152",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#0B1220",
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
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(42px, 5.5vw, 72px)",
                    fontWeight: 600,
                    lineHeight: 1,
                    letterSpacing: "-0.045em",
                    color: "#fff",
                  }}
                >
                  <Money value={animatedNetWorth} variant="full" />
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
                    · Total assets <Money value={metrics.totalAssets} variant="full" />
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
                      <Money value={momNetWorthDelta.delta} variant="full" />{" "}
                      {momNetWorthDelta.monthsGap === 1
                        ? "MoM"
                        : `${momNetWorthDelta.monthsGap}mo`}{" "}
                      (
                      {momNetWorthDelta.pct >= 0 ? "+" : ""}
                      {momNetWorthDelta.pct.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>

              {/* ── Net Worth Breakdown Grid ── */}
              {(() => {
                // "Other Assets" catches every contributor to totalAssets not shown individually
                const otherAssets =
                  (metrics.rdValue || 0) +
                  (metrics.bondValue || 0) +
                  (metrics.licValue || 0) +
                  (metrics.investmentValue || 0) +
                  (metrics.loansGivenValue || 0) +
                  (metrics.informalLentValue || 0) +
                  (metrics.rentalPropertiesAsset || 0) +
                  (metrics.rentedDepositAsset || 0) +
                  (metrics.prepaidValue || 0) +
                  (metrics.vehicleAsset || 0) +
                  (metrics.goldValue || 0);
                // "Other Dues" catches every liability not shown individually
                const otherDues =
                  (metrics.realEstateOutstanding || 0) +
                  (metrics.informalBorrowedValue || 0) +
                  (metrics.rentalDepositLiability || 0);
                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: "20px 28px",
                      position: "relative",
                      zIndex: 2,
                      paddingTop: 28,
                      borderTop: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {/* Assets */}
                    <HeroStat
                      label="Bank Cash"
                      value={metrics.cashInBanks}
                      tabId="banks"
                      setTab={setTab}
                    />
                    <HeroStat
                      label="Fixed Deposits"
                      value={metrics.fdValue}
                      tabId="investments"
                      subTabId="fd"
                      setTab={setTab}
                      setSubTab={setSubTab}
                    />
                    <HeroStat
                      label="Mutual Funds"
                      value={metrics.mfValue}
                      tabId="investments"
                      subTabId="mf"
                      setTab={setTab}
                      setSubTab={setSubTab}
                    />
                    <HeroStat
                      label="Stocks"
                      value={metrics.stockValue}
                      tabId="demat"
                      setTab={setTab}
                    />
                    <HeroStat
                      label="PPF / NPS / EPF"
                      value={metrics.ppfValue + metrics.npsValue + metrics.epfValue}
                      tabId="investments"
                      subTabId="ppf"
                      setTab={setTab}
                      setSubTab={setSubTab}
                    />
                    {(metrics.realEstateAsset || 0) > 0 && (
                      <HeroStat
                        label="Real Estate"
                        value={metrics.realEstateAsset}
                        tabId="realestate"
                        setTab={setTab}
                      />
                    )}
                    {(metrics.govtSchemesValue || 0) > 0 && (
                      <HeroStat
                        label="Govt Schemes"
                        value={metrics.govtSchemesValue}
                        tabId="govtschemes"
                        setTab={setTab}
                      />
                    )}
                    {otherAssets > 0 && (
                      <HeroStat
                        label="Other Assets"
                        value={otherAssets}
                        tabId="investments"
                        setTab={setTab}
                      />
                    )}
                    {/* Liabilities */}
                    <HeroStat
                      label="Card Dues"
                      value={metrics.ccOutstanding}
                      negative
                      tabId="cc"
                      setTab={setTab}
                    />
                    <HeroStat
                      label="Loans Taken"
                      value={metrics.loansTakenValue}
                      negative
                      tabId="taken"
                      setTab={setTab}
                    />
                    {otherDues > 0 && (
                      <HeroStat
                        label="Other Dues"
                        value={otherDues}
                        negative
                        tabId="realestate"
                        setTab={setTab}
                      />
                    )}
                  </div>
                );
              })()}
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
                onClick={() => setTab("budget")}
                className="card-lift"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Savings Rate
                  </span>
                  <ArrowUpRight size={14} style={{ color: THEME.muted }} />
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
                onClick={() => setTab("credit")}
                className="card-lift"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Debt-to-Asset Ratio
                  </span>
                  <ArrowUpRight size={14} style={{ color: THEME.muted }} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 38,
                      fontWeight: 600,
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
                    Liabilities <Money value={metrics.totalLiabilities} variant="full" />
                  </div>
                </div>
              </Card>

              {/* 3. LIQUIDITY SCORE — uses liquidAssets (cash + MF + stocks), not just cash */}
              <Card
                onClick={() => setTab("investments")}
                className="card-lift"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Liquidity Score
                  </span>
                  <ArrowUpRight size={14} style={{ color: THEME.muted }} />
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
                            fontFamily: "var(--font-display)",
                            fontSize: 38,
                            fontWeight: 600,
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
                          Cash <Money value={metrics.cashInBanks} variant="full" /> · MF+Stocks{" "}
                          <Money value={metrics.mfValue + metrics.stockValue} variant="full" />
                          <br />
                          Locked <Money value={locked} variant="full" /> · Target ≥30%
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Card>

              {/* 4. INVESTMENT P&L */}
              <Card
                onClick={() => setTab("demat")}
                className="card-lift"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Investment P&L
                  </span>
                  <ArrowUpRight size={14} style={{ color: THEME.muted }} />
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
                            fontFamily: "var(--font-display)",
                            fontSize: 34,
                            fontWeight: 600,
                            color: c,
                            lineHeight: 1,
                            marginBottom: 10,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {isPos ? "+" : ""}
                          <Money value={pnl} variant="full" />
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
                          Unrealised · Invested <Money value={invested} variant="full" />
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
                        background: healthSimActive
                          ? `color-mix(in srgb, var(--t-accent) 8%, transparent)`
                          : "transparent",
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
                            fontFamily: "var(--font-display)",
                            fontSize: 22,
                            fontWeight: 600,
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
                        background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                            ? `color-mix(in srgb, var(--t-sage) 4%, transparent)`
                            : d.daysLeft <= 5
                              ? `color-mix(in srgb, var(--t-rust) 3%, transparent)`
                              : `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${borderColor} 13%, transparent)`,
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
                            <Money value={d.amount} variant="full" />
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
                {(() => {
                  // Severity ramps rust→gold→sage like every other health widget on
                  // this dashboard (Debt-to-Asset, Liquidity Score, Emergency Fund) —
                  // this card used to always render sage regardless of streak length.
                  const streak = dashboardData.streak;
                  const streakColor =
                    streak === 0 ? THEME.rust : streak < 3 ? THEME.gold : THEME.sage;
                  const streakVariant: "rust" | "gold" | "sage" =
                    streak === 0 ? "rust" : streak < 3 ? "gold" : "sage";
                  return (
                    <>
                      <div
                        style={{
                          marginBottom: 6,
                          opacity: 0.85,
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <dashboardData.streakEmoji size={26} color={streakColor} />
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 32,
                          fontWeight: 600,
                          color: streakColor,
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {dashboardData.streak}
                      </div>
                      <div
                        style={{ fontSize: 13, color: THEME.muted, marginTop: 6, fontWeight: 600 }}
                      >
                        Months Saved
                      </div>
                      <Badge
                        variant={streakVariant}
                        style={{ marginTop: 12, padding: "5px 12px", fontSize: 11 }}
                      >
                        {dashboardData.streakMsg}
                      </Badge>
                    </>
                  );
                })()}
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
              </>
            )}
            {(dashboardWidgets?.["cashFlowLiquidity"] !== false) && (
              <>
            <DashboardSectionHeader
              title="Cash Flow & Liquidity"
              desc="Reserves, savings velocity, payoff timelines, and recurring liability coverage."
              icon={<Shield size={16} />}
            />

            {/* ── Emergency Fund Health Check ── */}
            {(() => {
              // Single source of truth: metrics.emergencyFund (see finance.ts's
              // getEmergencyFund* helpers) — this widget used to recompute its own
              // "bank cash + near-term FDs" figure independently of the dedicated
              // Emergency Fund tab, which also counted liquid mutual funds and
              // prepaid balances, so the same household saw two different numbers
              // for the same concept depending which screen they were on.
              const efData = metrics.emergencyFund;
              const efMonthlyExpense = efData.monthlyExpense;
              const nearTermFDs = efData.nearTermFDValue;
              const efLiquidBalance = efData.liquidAssets;
              const efRatio = efData.monthsCovered;
              const efTarget = efData.targetAmount;
              // Unclamped (unlike efData.gap, which floors at 0) so a fully-funded
              // household sees its actual surplus below instead of a flat ₹0.
              const efShortfall = efTarget - efLiquidBalance;
              const efProgress = efData.coveragePct;

              const efStatusColor = TIER_COLOR_EF[efData.tier];
              const efStatusLabel = efData.label;
              const EfIcon =
                efData.tier === "excellent" || efData.tier === "healthy"
                  ? CheckCircle2
                  : efData.tier === "building"
                    ? Shield
                    : AlertTriangle;

              let efAdvice = "";
              if (efMonthlyExpense <= 0) {
                efAdvice = "Add your monthly expenses to calculate your emergency fund coverage.";
              } else if (efRatio < 3) {
                const need3 = Math.max(0, efMonthlyExpense * 3 - efLiquidBalance);
                efAdvice = `Critical! You need ${privacyMode ? "••••" : fmtINRFull(need3)} more for a minimum 3-month buffer.`;
              } else if (efRatio < 6) {
                efAdvice = `Building well. ${privacyMode ? "••••" : fmtINRFull(Math.max(0, efShortfall))} more to reach the recommended 6-month buffer.`;
              } else {
                efAdvice = `Excellent! Your emergency fund covers ${efRatio.toFixed(1)} months of expenses.`;
              }

              // Segment fill: 6 segments, each = 1 month
              const filledSegments = Math.min(efRatio, 6);

              return (
                <Card
                  className="bento-col-12 card-lift"
                  style={{ padding: 24, cursor: setTab ? "pointer" : undefined }}
                  onClick={() => setTab && setTab("emergencyfund")}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                        <Shield size={22} color={efStatusColor} />
                      </div>
                      <div>
                        <div className="section-label" style={{ marginBottom: 0 }}>
                          Emergency Fund Health
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: THEME.muted,
                            fontWeight: 500,
                            marginTop: 2,
                          }}
                        >
                          Liquid reserves vs monthly expenses
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 12px",
                        borderRadius: "var(--radius-xs)",
                        background: `color-mix(in srgb, ${efStatusColor} 10%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${efStatusColor} 20%, transparent)`,
                      }}
                    >
                      <EfIcon size={13} color={efStatusColor} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: efStatusColor }}>
                        {efStatusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Ratio Display */}
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 42,
                        fontWeight: 600,
                        color: efStatusColor,
                        lineHeight: 1,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {efRatio.toFixed(1)}
                    </div>
                    <div
                      style={{ fontSize: 13, fontWeight: 600, color: THEME.muted, marginTop: 6 }}
                    >
                      months of expenses covered
                    </div>
                  </div>

                  {/* 6-Segment Progress Gauge */}
                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        height: 20,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: THEME.line,
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5].map((seg) => {
                        const segFill = Math.max(0, Math.min(1, filledSegments - seg));
                        const segColor = seg < 3 ? THEME.rust : seg < 6 ? THEME.gold : THEME.sage;
                        const fillColor =
                          filledSegments >= 6
                            ? THEME.sage
                            : filledSegments >= 3
                              ? THEME.gold
                              : THEME.rust;
                        return (
                          <div
                            key={seg}
                            style={{
                              flex: 1,
                              position: "relative",
                              background: "transparent",
                              borderRadius:
                                seg === 0 ? "10px 0 0 10px" : seg === 5 ? "0 10px 10px 0" : 0,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: `${segFill * 100}%`,
                                background: fillColor,
                                borderRadius: "inherit",
                                transition: "width 0.5s ease",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        color: THEME.muted,
                      }}
                    >
                      <span>0 mo</span>
                      <span style={{ color: efRatio >= 3 ? THEME.gold : THEME.muted }}>3 mo</span>
                      <span style={{ color: efRatio >= 6 ? THEME.sage : THEME.muted }}>6 mo</span>
                    </div>
                  </div>

                  {/* Key Numbers Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-sm), 1fr))",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      {
                        label: "Liquid Balance",
                        value: <Money value={efLiquidBalance} variant="full" />,
                        sub:
                          nearTermFDs > 0
                            ? `Incl. ${privacyMode ? "••••" : fmtINRFull(nearTermFDs)} near-term FDs`
                            : "Bank cash",
                        color: THEME.accent,
                      },
                      {
                        label: "Monthly Expense",
                        value: <Money value={efMonthlyExpense} variant="full" />,
                        sub: "Average monthly spend",
                        color: THEME.muted,
                      },
                      {
                        label: "Target (6 months)",
                        value: <Money value={efTarget} variant="full" />,
                        sub: "Recommended buffer",
                        color: THEME.gold,
                      },
                      {
                        label: efShortfall > 0 ? "Shortfall" : "Surplus",
                        value: <Money value={Math.abs(efShortfall)} variant="full" />,
                        sub: efShortfall > 0 ? "Amount needed" : "Above target",
                        color: efShortfall > 0 ? THEME.rust : THEME.sage,
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 12,
                          background: THEME.line,
                          border: `1px solid color-mix(in srgb, ${item.color} 12%, transparent)`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            lineHeight: 1.3,
                            minHeight: 26,
                            marginBottom: 6,
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: item.color,
                            lineHeight: 1,
                            marginBottom: 4,
                          }}
                        >
                          {item.value}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                          {item.sub}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendation */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${efStatusColor} 6%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${efStatusColor} 14%, transparent)`,
                      borderLeft: `3px solid ${efStatusColor}`,
                    }}
                  >
                    <EfIcon
                      size={16}
                      color={efStatusColor}
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
                    <div
                      style={{ fontSize: 13, color: THEME.ink, fontWeight: 600, lineHeight: 1.5 }}
                    >
                      {efAdvice}
                    </div>
                  </div>

                  {setTab && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 14,
                        fontSize: 12,
                        fontWeight: 700,
                        color: THEME.accent,
                      }}
                    >
                      View full breakdown & recommendations <ArrowUpRight size={13} />
                    </div>
                  )}
                </Card>
              );
            })()}

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
                          fontFamily: "var(--font-display)",
                          fontSize: 28,
                          fontWeight: 600,
                          color: wealthVelocity.avg >= 0 ? THEME.sage : THEME.rust,
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {wealthVelocity.avg >= 0 ? "+" : ""}
                        <Money value={wealthVelocity.avg} variant="full" />
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
                          <Money value={wealthVelocity.latest} variant="full" />
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
                          <Money value={wealthVelocity.avg * 12} variant="full" />/yr
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* EMI Summary */}
              {(() => {
                const activeLoans = (state.loansTaken || []).filter(
                  (l: any) => Number(l.outstanding || 0) > 0 && Number(l.monthsRemaining ?? 1) > 0
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
                            fontFamily: "var(--font-display)",
                            fontSize: 26,
                            fontWeight: 600,
                            color:
                              foirPct > 50 ? THEME.rust : foirPct > 40 ? THEME.gold : THEME.sage,
                            lineHeight: 1,
                            letterSpacing: "-0.02em",
                            marginBottom: 14,
                          }}
                        >
                          <Money value={totalEMI} variant="full" />
                          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
                            /mo
                          </span>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {activeLoans.slice(0, 3).map((l: any, i: number) => {
                            const outstanding = Number(l.outstanding || 0);
                            const emi = Number(l.emi || 0);
                            const rate = Number(l.rate || l.interestRate || 0) / 12 / 100;
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
                                  background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                                  border: `1px solid ${THEME.line}`,
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                                    {l.loanName || l.bank || "Loan"}
                                  </div>
                                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                                    Payoff: {timeStr} · <Money value={outstanding} variant="full" /> left
                                  </div>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>
                                  <Money value={emi} variant="full" />/mo
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
              </>
            )}
            {(dashboardWidgets?.["estateComparison"] !== false) && (
              <>
            <DashboardSectionHeader
              title="Estate & Comparison Analysis"
              desc="Audit of family nomination coverage, estate checklists, and fiscal year performance comparisons."
              icon={<Calendar size={16} />}
            />

            {/* ── Year-on-Year FY Comparison ── */}
            <Card className="bento-col-12" style={{ padding: 0, overflow: "hidden" }}>
              <button
                onClick={() => setYoyOpen((p) => !p)}
                aria-expanded={yoyOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 24px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <BarChart2 size={18} style={{ color: THEME.accent }} />
                  <span className="section-label" style={{ marginBottom: 0 }}>
                    Year-on-Year Comparison
                  </span>
                  <Badge variant="muted" style={{ fontSize: 10, padding: "2px 8px" }}>
                    FY {yoyFY1}-{String(yoyFY1 + 1).slice(-2)} vs {yoyFY2}-
                    {String(yoyFY2 + 1).slice(-2)}
                  </Badge>
                </div>
                {yoyOpen ? (
                  <ChevronUp size={20} style={{ color: THEME.muted }} />
                ) : (
                  <ChevronDown size={20} style={{ color: THEME.muted }} />
                )}
              </button>

              {yoyOpen && (
                <div style={{ padding: "0 24px 24px" }}>
                  {/* FY Selectors */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                        Compare
                      </span>
                      <select
                        value={yoyFY1}
                        onChange={(e) => setYoyFY1(Number(e.target.value))}
                        aria-label="First financial year to compare"
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.line}`,
                          background: "var(--surface-0)",
                          color: THEME.ink,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {yoyAvailableFYs.map((fy) => (
                          <option key={fy} value={fy}>
                            FY {fy}-{String(fy + 1).slice(-2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>with</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        value={yoyFY2}
                        onChange={(e) => setYoyFY2(Number(e.target.value))}
                        aria-label="Second financial year to compare"
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: `1px solid ${THEME.line}`,
                          background: "var(--surface-0)",
                          color: THEME.ink,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {yoyAvailableFYs.map((fy) => (
                          <option key={fy} value={fy}>
                            FY {fy}-{String(fy + 1).slice(-2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Comparison Table */}
                  <div
                    style={{
                      overflowX: "auto",
                      marginBottom: 24,
                      borderRadius: 12,
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                        minWidth: 580,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: `color-mix(in srgb, var(--t-accent) 6%, transparent)`,
                          }}
                        >
                          <th
                            style={{
                              textAlign: "left",
                              padding: "10px 16px",
                              fontWeight: 800,
                              color: THEME.ink,
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Metric
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "10px 16px",
                              fontWeight: 800,
                              color: THEME.accent,
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            FY {yoyFY1}-{String(yoyFY1 + 1).slice(-2)}
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "10px 16px",
                              fontWeight: 800,
                              color: THEME.muted,
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            FY {yoyFY2}-{String(yoyFY2 + 1).slice(-2)}
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "10px 16px",
                              fontWeight: 800,
                              color: THEME.ink,
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Change
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "10px 16px",
                              fontWeight: 800,
                              color: THEME.ink,
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            % Change
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {yoyComparison.rows.map((row: any, idx: number) => {
                          const isPositiveChange = row.change > 0;
                          const isNegativeChange = row.change < 0;
                          // For expenses, increase is BAD (red), decrease is GOOD (green) — inverted logic
                          const changeColor = row.invertColor
                            ? isPositiveChange
                              ? THEME.rust
                              : isNegativeChange
                                ? THEME.sage
                                : THEME.muted
                            : isPositiveChange
                              ? THEME.sage
                              : isNegativeChange
                                ? THEME.rust
                                : THEME.muted;
                          return (
                            <tr
                              key={row.label}
                              style={{
                                borderTop: idx > 0 ? `1px solid ${THEME.line}` : "none",
                                background:
                                  idx % 2 === 1
                                    ? `color-mix(in srgb, var(--t-accent) 4%, transparent)`
                                    : "transparent",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px 16px",
                                  fontWeight: 700,
                                  color: THEME.ink,
                                }}
                              >
                                {row.label}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                  color: THEME.ink,
                                }}
                              >
                                <Prv>
                                  {row.isPercent ? (
                                    `${row.v1.toFixed(1)}%`
                                  ) : (
                                    <Money value={row.v1} variant="full" />
                                  )}
                                </Prv>
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "right",
                                  fontWeight: 600,
                                  color: THEME.muted,
                                }}
                              >
                                <Prv>
                                  {row.isPercent ? (
                                    `${row.v2.toFixed(1)}%`
                                  ) : (
                                    <Money value={row.v2} variant="full" />
                                  )}
                                </Prv>
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                  color: changeColor,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-end",
                                    gap: 4,
                                  }}
                                >
                                  {isPositiveChange ? (
                                    <ArrowUpRight size={14} style={{ color: changeColor }} />
                                  ) : isNegativeChange ? (
                                    <ArrowDownRight size={14} style={{ color: changeColor }} />
                                  ) : null}
                                  <Prv>
                                    {row.isPercent ? (
                                      `${row.change > 0 ? "+" : ""}${row.change.toFixed(1)} pp`
                                    ) : (
                                      <>
                                        {row.change > 0 ? "+" : ""}
                                        <Money value={Math.abs(row.change)} variant="full" />
                                      </>
                                    )}
                                  </Prv>
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                }}
                              >
                                {!row.isPercent && (
                                  <Badge
                                    variant={
                                      row.change === 0
                                        ? "muted"
                                        : (row.invertColor ? !isPositiveChange : isPositiveChange)
                                          ? "sage"
                                          : "rust"
                                    }
                                    style={{ fontSize: 11, padding: "3px 10px" }}
                                  >
                                    {row.pct > 0 ? "+" : ""}
                                    {row.pct.toFixed(1)}%
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Grouped Bar Chart */}
                  <div style={{ marginBottom: 8 }}>
                    <div className="section-label" style={{ marginBottom: 12 }}>
                      Income / Expenses / Savings Comparison
                    </div>
                    {yoyComparison.chartData.every(
                      (d: any) =>
                        d[`FY ${yoyFY1}-${String(yoyFY1 + 1).slice(-2)}`] === 0 &&
                        d[`FY ${yoyFY2}-${String(yoyFY2 + 1).slice(-2)}`] === 0
                    ) ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "32px 0",
                          color: THEME.muted,
                          fontSize: 13,
                        }}
                      >
                        No data available for the selected fiscal years
                      </div>
                    ) : (
                      <div style={{ width: "100%", height: 280, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart
                          data={yoyComparison.chartData}
                          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                          barGap={4}
                          barCategoryGap="25%"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fontWeight: 700, fill: THEME.muted }}
                            axisLine={{ stroke: THEME.line }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: THEME.muted }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                          />
                          <Tooltip
                            cursor={{ fill: THEME.line, opacity: 0.4 }}
                            contentStyle={{
                              background: "var(--surface-0)",
                              border: `1px solid ${THEME.line}`,
                              borderRadius: 10,
                              fontSize: 13,
                              fontWeight: 600,
                              color: THEME.ink,
                            }}
                            labelStyle={{ color: THEME.muted }}
                            itemStyle={{ color: THEME.ink }}
                            formatter={(value: number) =>
                              privacyMode ? "••••" : fmtINRFull(value)
                            }
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}
                          />
                          <Bar
                            dataKey={`FY ${yoyFY1}-${String(yoyFY1 + 1).slice(-2)}`}
                            fill={THEME.accent}
                            radius={[6, 6, 0, 0]}
                            maxBarSize={48}
                          />
                          <Bar
                            dataKey={`FY ${yoyFY2}-${String(yoyFY2 + 1).slice(-2)}`}
                            fill={`color-mix(in srgb, ${THEME.accent} ${isDark ? 65 : 45}%, transparent)`}
                            radius={[6, 6, 0, 0]}
                            maxBarSize={48}
                          />
                        </BarChart>
                      </ResponsiveContainer></div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* ── Estate Planning — Nomination Coverage ── */}
            <Card className="bento-col-12" style={{ padding: 0, overflow: "hidden" }}>
              <button
                onClick={() => setNominationOpen((p) => !p)}
                aria-expanded={nominationOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 24px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Shield size={18} style={{ color: THEME.accent }} />
                  <span className="section-label" style={{ marginBottom: 0 }}>
                    Estate Planning — Nomination Coverage
                  </span>
                  <Badge
                    variant={
                      nominationAudit.pct > 80
                        ? "sage"
                        : nominationAudit.pct >= 50
                          ? "gold"
                          : "rust"
                    }
                    style={{ fontSize: 10, padding: "2px 8px" }}
                  >
                    {nominationAudit.covered}/{nominationAudit.total} covered
                  </Badge>
                </div>
                {nominationOpen ? (
                  <ChevronUp size={20} style={{ color: THEME.muted }} />
                ) : (
                  <ChevronDown size={20} style={{ color: THEME.muted }} />
                )}
              </button>

              {nominationOpen && (
                <div style={{ padding: "0 24px 24px" }}>
                  {/* Priority Alerts */}
                  {nominationAudit.insuranceMissing > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
                        marginBottom: 10,
                        fontSize: 13,
                        color: THEME.ink,
                        lineHeight: 1.5,
                      }}
                    >
                      <AlertTriangle
                        size={16}
                        style={{ color: THEME.gold, marginTop: 2, flexShrink: 0 }}
                      />
                      <span>
                        <strong>
                          {nominationAudit.insuranceMissing} insurance{" "}
                          {nominationAudit.insuranceMissing === 1 ? "policy has" : "policies have"}{" "}
                          no nominee
                        </strong>{" "}
                        — this can delay claim settlement
                      </span>
                    </div>
                  )}
                  {nominationAudit.accountMissing > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: `color-mix(in srgb, var(--t-accent) 6%, transparent)`,
                        border: `1px solid color-mix(in srgb, var(--t-accent) 18%, transparent)`,
                        marginBottom: 10,
                        fontSize: 13,
                        color: THEME.ink,
                        lineHeight: 1.5,
                      }}
                    >
                      <Shield
                        size={16}
                        style={{ color: THEME.accent, marginTop: 2, flexShrink: 0 }}
                      />
                      <span>
                        <strong>
                          {nominationAudit.accountMissing}{" "}
                          {nominationAudit.accountMissing === 1 ? "account has" : "accounts have"}{" "}
                          no nominee
                        </strong>{" "}
                        — consider adding for smooth succession
                      </span>
                    </div>
                  )}

                  {/* Coverage Summary */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 6 }}
                      >
                        {nominationAudit.covered} of {nominationAudit.total} accounts have nominees
                        assigned
                      </div>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 4,
                          background: THEME.line,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${nominationAudit.pct}%`,
                            borderRadius: 4,
                            background:
                              nominationAudit.pct > 80
                                ? THEME.sage
                                : nominationAudit.pct >= 50
                                  ? THEME.gold
                                  : THEME.rust,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 28,
                        fontWeight: 600,
                        color:
                          nominationAudit.pct > 80
                            ? THEME.sage
                            : nominationAudit.pct >= 50
                              ? THEME.gold
                              : THEME.rust,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {nominationAudit.pct}%
                    </div>
                  </div>

                  {/* Account-by-Account Audit Table */}
                  {nominationAudit.total > 0 ? (
                    <div
                      style={{
                        overflowX: "auto",
                        marginBottom: 24,
                        borderRadius: 12,
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 13,
                          minWidth: 480,
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: `color-mix(in srgb, var(--t-accent) 6%, transparent)`,
                            }}
                          >
                            <th
                              style={{
                                textAlign: "left",
                                padding: "10px 16px",
                                fontWeight: 800,
                                color: THEME.ink,
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              Account Type
                            </th>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "10px 16px",
                                fontWeight: 800,
                                color: THEME.ink,
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              Account Name
                            </th>
                            <th
                              style={{
                                textAlign: "center",
                                padding: "10px 16px",
                                fontWeight: 800,
                                color: THEME.ink,
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              Nominee Status
                            </th>
                            <th
                              style={{
                                textAlign: "center",
                                padding: "10px 16px",
                                fontWeight: 800,
                                color: THEME.ink,
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {nominationAudit.accounts.map((acc, idx) => (
                            <tr
                              key={`${acc.type}-${acc.name}-${idx}`}
                              style={{
                                borderTop: `1px solid ${THEME.line}`,
                                background:
                                  idx % 2 === 0 ? "transparent" : `color-mix(in srgb, ${THEME.ink} 2%, transparent)`,
                              }}
                            >
                              <td
                                style={{
                                  padding: "10px 16px",
                                  fontWeight: 600,
                                  color: THEME.muted,
                                  fontSize: 12,
                                }}
                              >
                                {acc.type}
                              </td>
                              <td
                                style={{ padding: "10px 16px", fontWeight: 700, color: THEME.ink }}
                              >
                                <Prv>{acc.name}</Prv>
                              </td>
                              <td style={{ padding: "10px 16px", textAlign: "center" }}>
                                {acc.hasNominee ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      color: THEME.sage,
                                      fontWeight: 700,
                                      fontSize: 12,
                                    }}
                                  >
                                    <CheckCircle2 size={14} /> Assigned
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      color: THEME.rust,
                                      fontWeight: 700,
                                      fontSize: 12,
                                    }}
                                  >
                                    <XCircle size={14} /> Missing
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "10px 16px", textAlign: "center" }}>
                                {!acc.hasNominee && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Add nominee for ${acc.name}`}
                                    onClick={() =>
                                      openNomineeModal({
                                        key: acc.key,
                                        ids: acc.ids,
                                        type: acc.type,
                                        name: acc.name,
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openNomineeModal({
                                          key: acc.key,
                                          ids: acc.ids,
                                          type: acc.type,
                                          name: acc.name,
                                        });
                                      }
                                    }}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: THEME.accent,
                                      cursor: "pointer",
                                      textDecoration: "underline",
                                      textUnderlineOffset: 2,
                                    }}
                                  >
                                    Add nominee
                                  </span>
                                )}
                                {acc.hasNominee && (
                                  <span style={{ color: THEME.muted, fontSize: 12 }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px 0",
                        color: THEME.muted,
                        fontSize: 13,
                        marginBottom: 24,
                      }}
                    >
                      No financial accounts found — add bank accounts, demat, insurance, or
                      investments to track nomination coverage.
                    </div>
                  )}

                  {/* Estate Planning Checklist */}
                  <div
                    style={{
                      padding: "20px 20px 16px",
                      borderRadius: 14,
                      border: `1px solid ${THEME.line}`,
                      background: `color-mix(in srgb, ${THEME.ink} 2%, transparent)`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 14,
                      }}
                    >
                      <Shield size={16} style={{ color: THEME.accent }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                        Estate Planning Checklist
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {[
                        { key: "will", label: "Will created/updated" },
                        { key: "nominees", label: "Nominees assigned to all accounts" },
                        { key: "poa", label: "Power of Attorney documented" },
                        { key: "joint", label: "Joint holder added to key accounts" },
                        { key: "family", label: "Family informed of account locations" },
                        { key: "digital", label: "Digital credentials documented securely" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: estateChecklist[item.key]
                              ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                              : "transparent",
                            border: `1px solid ${estateChecklist[item.key] ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)` : "transparent"}`,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!estateChecklist[item.key]}
                            onChange={() => toggleEstateItem(item.key)}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: THEME.sage,
                              cursor: "pointer",
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: estateChecklist[item.key] ? THEME.sage : THEME.ink,
                              textDecoration: estateChecklist[item.key] ? "line-through" : "none",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
              </>
            )}
            {(dashboardWidgets?.["recentActivity"] !== false) && (
              <>
            <DashboardSectionHeader
              title="Recent Ledger Activity"
              desc="Real-time transaction tracking and categorization filters."
              icon={<Receipt size={16} />}
            />

            {/* Recent Transactions */}
            <Card className="bento-col-12" style={{ padding: 24 }}>
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
                        aria-pressed={txnFilter === f}
                        style={{
                          padding: "3px 10px",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 700,
                          background: txnFilter === f ? THEME.accent : "transparent",
                          color: txnFilter === f ? THEME.darkInk : THEME.muted,
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
                        border: `1px solid color-mix(in srgb, var(--t-accent) 27%, transparent)`,
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
                          background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div
                            style={{
                              color: t.type === "credit" ? THEME.sage : THEME.rust,
                              display: "flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            {t.type === "credit" ? <TrendingUp size={20} /> : <Receipt size={20} />}
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
                                const bank = (state.bankAccounts || []).find(
                                  (b: any) => b.id === t.accountId
                                );
                                if (!bank) return null;
                                const last4 = bank.accountNumber
                                  ? bank.accountNumber.slice(-4)
                                  : "";
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
                            <Money value={t.amount} variant="full" />
                          </div>
                          <span
                            style={{
                              display: "inline-block",
                              marginTop: 4,
                              padding: "2px 8px",
                              borderRadius: "var(--radius-xs)",
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.04em",
                              background:
                                t.type === "credit"
                                  ? `color-mix(in srgb, var(--t-sage) 10%, transparent)`
                                  : `color-mix(in srgb, var(--t-rust) 10%, transparent)`,
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
              </>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── SUB-TAB: TRENDS ────────────────── */}
      {sub === "trends" && (
        <div key="trends" className="tab-content-enter">
          {/* Hero Header */}
          <div className="sub-tab-hero animate-fade-in">
            <span className="sub-tab-hero-icon">
              <TrendingUp size={28} />
            </span>
            <div className="sub-tab-hero-body">
              <div className="sub-tab-hero-title">Trends &amp; History</div>
              <div className="sub-tab-hero-desc">
                Track wealth growth, income/expense patterns, savings trajectory and investment
                returns over time
              </div>
            </div>
            <div className="sub-tab-hero-badge">
              <Clock size={12} /> {trendPeriod === "All" ? "All time" : `Last ${trendPeriod}`}
            </div>
          </div>

          {/* ── Trends KPI Strip ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-md), 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {(
              [
                {
                  label: "Net Worth",
                  value: fmtINRFull(animatedNetWorth),
                  money: true,
                  delta:
                    filteredNetWorthTrend.length >= 2
                      ? (
                          ((filteredNetWorthTrend[filteredNetWorthTrend.length - 1].value -
                            filteredNetWorthTrend[0].value) /
                            Math.abs(filteredNetWorthTrend[0].value || 1)) *
                          100
                        ).toFixed(1) + "%"
                      : null,
                  positive:
                    filteredNetWorthTrend.length >= 2
                      ? filteredNetWorthTrend[filteredNetWorthTrend.length - 1].value >=
                        filteredNetWorthTrend[0].value
                      : metrics.netWorth >= 0,
                  icon: TrendingUp,
                },
                {
                  label: "YTD Income",
                  value: fmtINRFull(animatedYtdIncome),
                  money: true,
                  delta: null,
                  positive: ytdData.ytdIncome >= 0,
                  icon: IndianRupee,
                },
                {
                  label: "YTD Savings Rate",
                  value: ytdData.ytdIncome > 0 ? ytdData.ytdSavingsRate.toFixed(1) + "%" : "—",
                  money: false,
                  delta: null,
                  positive: ytdData.ytdSavingsRate >= 20,
                  icon: Landmark,
                },
                {
                  label: "Portfolio Return",
                  value:
                    metrics.mfInvested + metrics.stockInvested > 0
                      ? (
                          ((metrics.mfValue +
                            metrics.stockValue -
                            (metrics.mfInvested + metrics.stockInvested)) /
                            (metrics.mfInvested + metrics.stockInvested)) *
                          100
                        ).toFixed(1) + "%"
                      : "—",
                  money: false,
                  delta: null,
                  positive:
                    metrics.mfValue + metrics.stockValue >=
                    metrics.mfInvested + metrics.stockInvested,
                  icon: BarChart2,
                },
              ] as {
                label: string;
                value: string;
                money: boolean;
                delta: string | null;
                positive: boolean;
                icon: any;
              }[]
            ).map(({ label, value, money, delta, positive, icon: Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  padding: "18px 20px",
                  borderRadius: 16,
                  background: isDark ? "var(--surface-1)" : "var(--t-paper)",
                  border: `1px solid ${THEME.line}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 8,
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: THEME.muted,
                    }}
                  >
                    {label}
                  </span>
                  <Icon size={16} color={THEME.muted} />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 600,
                    color: positive ? THEME.sage : THEME.rust,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                  }}
                >
                  {money ? maskCurrencyInText(value, privacyMode) : value}
                </div>
                {delta !== null && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: positive ? THEME.sage : THEME.rust,
                      background: `color-mix(in srgb, ${
                        positive ? THEME.sage : THEME.rust
                      } 10%, transparent)`,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-xs)",
                      width: "fit-content",
                    }}
                  >
                    {positive ? "▲" : "▼"} {delta}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bento-grid">
            {/* Left Column (8 columns): Graphical Charts */}
            <div
              className="bento-col-8"
              style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
              {/* Section Header: Charts */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingBottom: 4,
                  borderBottom: `2px solid ${THEME.line}`,
                }}
              >
                <span
                  style={{
                    lineHeight: 1,
                    display: "flex",
                  }}
                >
                  <BarChart2 size={16} color={THEME.ink} />
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: THEME.ink,
                  }}
                >
                  Historical Charts
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: THEME.line,
                    marginLeft: 4,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 500,
                  }}
                >
                  Growth · P&L · Savings · Returns
                </span>
              </div>

              {/* Net Worth Growth */}
              <Card
                style={{
                  padding: 0,
                  overflow: "hidden",
                  borderTop: `3px solid ${THEME.accent}`,
                }}
              >
                <div style={{ padding: "20px 24px 0" }}>
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
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <TrendingUp size={16} color={THEME.ink} />
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: THEME.ink,
                            letterSpacing: "-0.01em",
                          }}
                        >
                          Net Worth Growth
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        Cumulative wealth trajectory over time
                      </div>
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
                          aria-pressed={trendPeriod === p}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 6,
                            border: "none",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 700,
                            background: trendPeriod === p ? THEME.accent : "transparent",
                            color: trendPeriod === p ? THEME.darkInk : THEME.muted,
                            transition: "all 0.2s ease",
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ padding: "0 24px 20px" }}>
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
                        background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                        borderRadius: 12,
                      }}
                    >
                      Not enough history to show net worth trend
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: 280, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={filteredNetWorthTrend}>
                        <defs>
                          <linearGradient id="gNw" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="0%"
                              stopColor={THEME.accent}
                              stopOpacity={isDark ? 0.55 : 0.4}
                            />
                            <stop
                              offset="100%"
                              stopColor={THEME.accent}
                              stopOpacity={isDark ? 0.08 : 0}
                            />
                          </linearGradient>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow
                              dx="0"
                              dy="4"
                              stdDeviation="6"
                              floodColor={THEME.accent}
                              floodOpacity={isDark ? "0.65" : "0.5"}
                            />
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                        <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                        <YAxis
                          tick={{ fill: THEME.muted, fontSize: 11 }}
                          tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                          width={85}
                        />
                        <Tooltip
                          formatter={(v: any) => (privacyMode ? "••••" : fmtINRFull(v))}
                          cursor={{ stroke: THEME.line }}
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: "1px solid var(--t-line)",
                            borderRadius: 12,
                            boxShadow: "var(--shadow-xl)",
                            color: THEME.ink,
                          }}
                          labelStyle={{ color: THEME.muted }}
                          itemStyle={{ color: THEME.ink }}
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
                    </ResponsiveContainer></div>
                  )}
                </div>
              </Card>

              {/* Historical P&L Bar Chart */}
              <Card
                style={{
                  padding: 24,
                  borderTop: `3px solid ${THEME.sage}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <Activity size={16} color={THEME.ink} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Monthly P&L (Last 6 Months)
                  </span>
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
                  Income vs. Expense comparison across recent months
                </div>
                {trendData.filter((t) => t.income > 0 || t.expense > 0).length === 0 ? (
                  <div
                    style={{
                      height: 250,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: THEME.muted,
                      fontSize: 13,
                      background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                      borderRadius: 12,
                    }}
                  >
                    Add transactions to see your P&L trend
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 250, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={trendData.slice(-6)}>
                      <defs>
                        <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.sage} stopOpacity={isDark ? 1 : 0.9} />
                          <stop
                            offset="100%"
                            stopColor={THEME.sage}
                            stopOpacity={isDark ? 0.7 : 0.4}
                          />
                        </linearGradient>
                        <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.rust} stopOpacity={isDark ? 1 : 0.9} />
                          <stop
                            offset="100%"
                            stopColor={THEME.rust}
                            stopOpacity={isDark ? 0.7 : 0.4}
                          />
                        </linearGradient>
                        <filter id="glow-sage" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="4"
                            floodColor={THEME.sage}
                            floodOpacity={isDark ? "0.55" : "0.4"}
                          />
                        </filter>
                        <filter id="glow-rust" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="4"
                            floodColor={THEME.rust}
                            floodOpacity={isDark ? "0.55" : "0.4"}
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
                        tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                        tick={{ fill: THEME.muted, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v: any) => (privacyMode ? "••••" : fmtINRFull(v))}
                        cursor={{ fill: THEME.line, opacity: 0.4 }}
                        contentStyle={{
                          background: "var(--surface-0)",
                          border: "1px solid var(--t-line)",
                          borderRadius: 12,
                          boxShadow: "var(--shadow-xl)",
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.muted }}
                        itemStyle={{ color: THEME.ink }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ color: THEME.ink }} />
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
                  </ResponsiveContainer></div>
                )}
              </Card>

              {/* Side-by-Side Savings and Portfolio Return */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg), 1fr))",
                  gap: 24,
                }}
              >
                {/* Monthly Net Savings */}
                <Card
                  style={{
                    padding: 24,
                    borderTop: `3px solid ${THEME.accent}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Wallet size={16} color={THEME.ink} />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: THEME.ink,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Monthly Net Savings
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
                    Green = surplus, red = deficit
                  </div>
                  <div style={{ width: "100%", height: 250, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={trendData.slice(-6)}>
                      <defs>
                        <linearGradient id="gNetPos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.sage} stopOpacity={isDark ? 1 : 0.9} />
                          <stop
                            offset="100%"
                            stopColor={THEME.sage}
                            stopOpacity={isDark ? 0.7 : 0.3}
                          />
                        </linearGradient>
                        <linearGradient id="gNetNeg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.rust} stopOpacity={isDark ? 1 : 0.9} />
                          <stop
                            offset="100%"
                            stopColor={THEME.rust}
                            stopOpacity={isDark ? 0.7 : 0.3}
                          />
                        </linearGradient>
                        <filter id="glow-net" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="4"
                            floodColor={THEME.accent}
                            floodOpacity={isDark ? "0.55" : "0.4"}
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
                        tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                        tick={{ fill: THEME.muted, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(v: any) => [privacyMode ? "••••" : fmtINRFull(v), "Net Savings"]}
                        cursor={{ fill: THEME.line, opacity: 0.4 }}
                        contentStyle={{
                          background: "var(--surface-0)",
                          border: "1px solid var(--t-line)",
                          borderRadius: 12,
                          boxShadow: "var(--shadow-xl)",
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.muted }}
                        itemStyle={{ color: THEME.ink }}
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
                            fillOpacity={isDark ? 1 : 0.85}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer></div>
                </Card>

                {/* Portfolio Return */}
                <Card
                  style={{
                    padding: 24,
                    borderTop: `3px solid ${THEME.gold}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <BarChart2 size={16} color={THEME.ink} />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: THEME.ink,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Portfolio Return
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
                    Current value vs. amount invested (MF & Stocks)
                  </div>
                  {!metrics.mfInvested && !metrics.stockInvested ? (
                    <div
                      style={{
                        height: 250,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: THEME.muted,
                        fontSize: 13,
                        background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                        borderRadius: 12,
                      }}
                    >
                      Add mutual funds or stocks to see portfolio returns
                    </div>
                  ) : (
                  <div style={{ width: "100%", height: 250, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                          <stop offset="0%" stopColor={THEME.sage} stopOpacity={isDark ? 1 : 0.9} />
                          <stop
                            offset="100%"
                            stopColor={THEME.sage}
                            stopOpacity={isDark ? 0.7 : 0.4}
                          />
                        </linearGradient>
                        <linearGradient id="gInvested" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor={THEME.muted}
                            stopOpacity={isDark ? 0.7 : 0.5}
                          />
                          <stop
                            offset="100%"
                            stopColor={THEME.muted}
                            stopOpacity={isDark ? 0.35 : 0.1}
                          />
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
                        tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                        tick={{ fill: THEME.muted, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={85}
                      />
                      <Tooltip
                        formatter={(v: any) => (privacyMode ? "••••" : fmtINRFull(v))}
                        cursor={{ fill: THEME.line, opacity: 0.4 }}
                        contentStyle={{
                          background: "var(--surface-0)",
                          border: "1px solid var(--t-line)",
                          borderRadius: 12,
                          boxShadow: "var(--shadow-xl)",
                          color: THEME.ink,
                        }}
                        labelStyle={{ color: THEME.muted }}
                        itemStyle={{ color: THEME.ink }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ color: THEME.ink }} />
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
                  </ResponsiveContainer></div>
                  )}
                </Card>
              </div>
            </div>

            {/* Right Column (4 columns): Performance metrics & Family */}
            <div
              className="bento-col-4"
              style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
              {/* Section Header: Metrics */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingBottom: 4,
                  borderBottom: `2px solid ${THEME.line}`,
                }}
              >
                <span
                  style={{
                    lineHeight: 1,
                    display: "flex",
                  }}
                >
                  <Target size={16} color={THEME.ink} />
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: THEME.ink,
                  }}
                >
                  Performance
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: THEME.line,
                    marginLeft: 4,
                  }}
                />
              </div>

              {/* YTD Cumulative block */}
              <Card
                style={{
                  padding: 24,
                  borderTop: `3px solid ${THEME.accent}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 20,
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <Calendar size={16} color={THEME.ink} />
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: THEME.ink,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        Year-to-Date Performance
                      </span>
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
                        aria-pressed={ytdMode === mode}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: `1.5px solid ${ytdMode === mode ? THEME.accent : THEME.line}`,
                          background:
                            ytdMode === mode
                              ? `color-mix(in srgb, var(--t-accent) 10%, transparent)`
                              : "transparent",
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
                <div style={{ display: "grid", gap: 16 }}>
                  {[
                    {
                      label: "YTD Income",
                      value: <Money value={animatedYtdIncome} variant="full" />,
                      color: ytdData.ytdIncome > 0 ? THEME.sage : THEME.muted,
                    },
                    {
                      label: "YTD Expense",
                      value: <Money value={animatedYtdExpense} variant="full" />,
                      color: ytdData.ytdExpense > 0 ? THEME.rust : THEME.muted,
                    },
                    {
                      label: "YTD Savings",
                      value: <Money value={animatedYtdSavings} variant="full" />,
                      color:
                        ytdData.ytdIncome === 0 && ytdData.ytdExpense === 0
                          ? THEME.muted
                          : ytdData.ytdSavings >= 0
                            ? THEME.sage
                            : THEME.rust,
                    },
                    {
                      label: "YTD Savings Rate",
                      value: ytdData.ytdIncome > 0 ? ytdData.ytdSavingsRate.toFixed(1) + "%" : "—",
                      color:
                        ytdData.ytdIncome === 0
                          ? THEME.muted
                          : ytdData.ytdSavingsRate >= 20
                            ? THEME.sage
                            : ytdData.ytdSavingsRate >= 10
                              ? THEME.gold
                              : THEME.rust,
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        borderLeft: `3px solid ${color}`,
                        background: `color-mix(in srgb, ${color} 6%, transparent)`,
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
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 20,
                          fontWeight: 600,
                          color,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── Family / Household Dashboard ── */}
              {(() => {
                // Only show if multiple profiles have assets
                const activeProfiles = (metrics.familyBreakdown || []).filter(
                  (p: any) => Math.abs(p.nw) > 0 || p.totalCover > 0
                );
                if (activeProfiles.length < 2) return null;

                const familyNW = activeProfiles.reduce((s, p) => s + p.nw, 0);
                const maxNW = Math.max(...activeProfiles.map((p) => p.nw));
                const familyCover = activeProfiles.reduce((s, p) => s + p.totalCover, 0);

                // Insurance adequacy: 10x annual income
                const incomeTxns = (state.transactions || []).filter(
                  (t: any) =>
                    t.type === "credit" &&
                    t.category !== "Transfer" &&
                    t.category !== "Self Transfer" &&
                    t.category !== "Self-Transfer"
                );
                const annualIncome = incomeTxns.reduce(
                  (s: number, t: any) => s + Number(t.amount || 0),
                  0
                );
                // Estimate yearly: if we have at least 1 month of data, annualize
                // (same filtered set as annualIncome, so a self-transfer-only month
                // doesn't inflate the divisor without a matching numerator)
                const txnMonths = new Set(
                  incomeTxns.map((t: any) => (t.date || "").slice(0, 7))
                ).size;
                const estimatedAnnualIncome = txnMonths > 0 ? (annualIncome / txnMonths) * 12 : 0;
                const idealCover = estimatedAnnualIncome * 10;
                const coverAdequacy =
                  idealCover > 0 ? Math.min(100, Math.round((familyCover / idealCover) * 100)) : 0;

                const barColors = [THEME.accent, THEME.sage, THEME.gold, THEME.rust];

                return (
                  <Card style={{ padding: 24 }}>
                    <div style={{ marginBottom: 20 }}>
                      <div className="section-label" style={{ marginBottom: 4 }}>
                        Family / Household Dashboard
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        Net worth breakdown across {activeProfiles.length} family members
                      </div>
                    </div>

                    {/* Combined Family Net Worth */}
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: 12,
                        background: isDark ? "var(--surface-2)" : "#0F172A",
                        marginBottom: 20,
                        textAlign: "center",
                        border: isDark ? `1px solid ${THEME.line}` : "none",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.15em",
                          marginBottom: 4,
                          fontWeight: 700,
                        }}
                      >
                        Combined Family Net Worth
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 28,
                          fontWeight: 600,
                          color: "#fff",
                          letterSpacing: "-0.03em",
                        }}
                      >
                        <Money value={familyNW} variant="full" />
                      </div>
                    </div>

                    {/* Per-member horizontal bars */}
                    <div style={{ marginBottom: 20 }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 12,
                        }}
                      >
                        Per-Member Net Worth
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {activeProfiles
                          .sort((a, b) => b.nw - a.nw)
                          .map((p, i) => {
                            const pct = maxNW > 0 ? (p.nw / maxNW) * 100 : 0;
                            const share = familyNW > 0 ? ((p.nw / familyNW) * 100).toFixed(1) : "0";
                            return (
                              <div key={p.id}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 4,
                                  }}
                                >
                                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                                    {p.name}
                                  </span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: THEME.muted,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {share}%
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: barColors[i % barColors.length],
                                      }}
                                    >
                                      <Money value={p.nw} variant="full" />
                                    </span>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    height: 8,
                                    background: THEME.line,
                                    borderRadius: 4,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${pct}%`,
                                      background: barColors[i % barColors.length],
                                      borderRadius: 4,
                                      transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Combined Insurance Coverage */}
                    {familyCover > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: THEME.muted,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 12,
                          }}
                        >
                          Family Insurance Coverage
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                            marginBottom: 14,
                          }}
                        >
                          <div
                            style={{
                              padding: 14,
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${THEME.accent} 5%, transparent)`,
                              borderTop: `3px solid ${THEME.accent}`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: THEME.muted,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                marginBottom: 6,
                              }}
                            >
                              Total Cover
                            </div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, color: THEME.accent }}>
                              <Money value={familyCover} variant="full" />
                            </div>
                          </div>
                          <div
                            style={{
                              padding: 14,
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${coverAdequacy >= 80 ? THEME.sage : coverAdequacy >= 50 ? THEME.gold : THEME.rust} 5%, transparent)`,
                              borderTop: `3px solid ${coverAdequacy >= 80 ? THEME.sage : coverAdequacy >= 50 ? THEME.gold : THEME.rust}`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: THEME.muted,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                marginBottom: 6,
                              }}
                            >
                              Adequacy (10x Income)
                            </div>
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 900,
                                color:
                                  coverAdequacy >= 80
                                    ? THEME.sage
                                    : coverAdequacy >= 50
                                      ? THEME.gold
                                      : THEME.rust,
                              }}
                            >
                              {idealCover > 0 ? `${coverAdequacy}%` : "N/A"}
                            </div>
                          </div>
                        </div>

                        {idealCover > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 11,
                                color: THEME.muted,
                                marginBottom: 4,
                              }}
                            >
                              <span>
                                Coverage: <Money value={familyCover} variant="full" />
                              </span>
                              <span>
                                Ideal (10x): <Money value={idealCover} variant="full" />
                              </span>
                            </div>
                            <div
                              style={{
                                height: 8,
                                background: THEME.line,
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${coverAdequacy}%`,
                                  background:
                                    coverAdequacy >= 80
                                      ? THEME.sage
                                      : coverAdequacy >= 50
                                        ? THEME.gold
                                        : THEME.rust,
                                  borderRadius: 4,
                                }}
                              />
                            </div>
                            {coverAdequacy < 80 && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: THEME.rust,
                                  fontWeight: 600,
                                  marginTop: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <AlertTriangle size={12} />
                                Gap of <Money value={idealCover - familyCover} variant="full" /> — consider
                                increasing term insurance
                              </div>
                            )}
                          </div>
                        )}

                        {/* Per-member cover breakdown */}
                        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                          {activeProfiles
                            .filter((p) => p.totalCover > 0)
                            .map((p, i) => (
                              <div
                                key={p.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  padding: "6px 10px",
                                  background: `color-mix(in srgb, ${THEME.ink} 4%, transparent)`,
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              >
                                <span style={{ color: THEME.muted }}>{p.name}</span>
                                <span style={{ fontWeight: 700, color: THEME.ink }}>
                                  <Money value={p.totalCover} variant="full" />
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── SUB-TAB: ALLOCATION ────────────────── */}
      {sub === "allocation" && (
        <div key="allocation" className="tab-content-enter">
          {/* Hero Header */}
          <div className="sub-tab-hero animate-fade-in">
            <span className="sub-tab-hero-icon">
              <Target size={28} />
            </span>
            <div className="sub-tab-hero-body">
              <div className="sub-tab-hero-title">Portfolio Allocation</div>
              <div className="sub-tab-hero-desc">
                Asset class distribution, diversification analysis, sector breakdown and
                concentration risk
              </div>
            </div>
            <div className="sub-tab-hero-badge">
              <IndianRupee size={12} /> <Money value={metrics.totalAssets} variant="full" /> assets
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
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

              {!assetBreakdown?.length ? (
                <div
                  style={{
                    height: 300,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: THEME.muted,
                    fontSize: 13,
                    background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                    borderRadius: 12,
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  Add assets in Bank Accounts, Demat, or Investments Portfolio to see allocation.
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
                    <div style={{ width: "100%", height: 260, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                fill={getAssetClassColor(item.name, i)}
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
                    </ResponsiveContainer></div>

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
                        <Money
                          value={
                            activeAssetIndex !== null
                              ? assetBreakdown[activeAssetIndex]?.value
                              : selectedAssetClass
                                ? assetBreakdown.find((x) => x.name === selectedAssetClass)?.value || 0
                                : metrics.totalAssets
                          }
                          variant="full"
                        />
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
                                background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                                <Money value={item.value} variant="full" />
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
                          const color = getAssetClassColor(item.name, i);
                          const pct = ((item.value / (metrics.totalAssets || 1)) * 100).toFixed(1);
                          return (
                            <div
                              key={i}
                              role="button"
                              tabIndex={0}
                              aria-label={`Drill down into ${item.name}`}
                              onMouseEnter={() => setActiveAssetIndex(i)}
                              onMouseLeave={() => setActiveAssetIndex(null)}
                              onClick={() => setSelectedAssetClass(item.name)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedAssetClass(item.name);
                                }
                              }}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: isHovered
                                  ? `color-mix(in srgb, ${THEME.ink} 5%, transparent)`
                                  : `color-mix(in srgb, ${THEME.ink} 2%, transparent)`,
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
                                <Money value={item.value} variant="full" />
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
                      <Money value={metrics.totalAssets} variant="full" />
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
                      <Money value={metrics.totalLiabilities} variant="full" />
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
                      fontFamily: "var(--font-display)",
                      fontSize: 32,
                      fontWeight: 600,
                      color: isPositive ? THEME.accent : THEME.rust,
                    }}
                  >
                    <Money value={metrics.netWorth} variant="full" />
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
                    {lastTradingDayPerformance.topGainer ? (
                      <Money value={lastTradingDayPerformance.topGainer.price} variant="full" />
                    ) : (
                      "₹0"
                    )}
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
                    {lastTradingDayPerformance.topLoser ? (
                      <Money value={lastTradingDayPerformance.topLoser.price} variant="full" />
                    ) : (
                      "₹0"
                    )}
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
                    lastTradingDayPerformance.noChangeStocks.length > 0 ? (
                      <Money
                        value={
                          lastTradingDayPerformance.noChangeStocks.reduce(
                            (sum: number, x: any) => sum + x.price,
                            0
                          ) / lastTradingDayPerformance.noChangeStocks.length
                        }
                        variant="full"
                      />
                    ) : (
                      "₹0"
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                    avg. price
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg), 1fr))",
                gap: 32,
              }}
            >
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
                {!metrics.stockSectorBreakdown?.length ? (
                  <div
                    style={{
                      padding: "40px 0",
                      textAlign: "center",
                      color: THEME.muted,
                      fontSize: 13,
                      background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                                  <Money value={s.value} variant="full" />
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
                {!metrics.stockCapBreakdown?.length ? (
                  <div
                    style={{
                      padding: "40px 0",
                      textAlign: "center",
                      color: THEME.muted,
                      fontSize: 13,
                      background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                      <div style={{ width: "100%", height: 180, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                  fill={[THEME.accent, THEME.sage, THEME.gold, THEME.rust][i % 4]}
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
                      </ResponsiveContainer></div>

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
                          <Money
                            value={
                              activeCapIndex !== null
                                ? metrics.stockCapBreakdown[activeCapIndex]?.value
                                : selectedCapClass
                                  ? metrics.stockCapBreakdown.find((x) => x.name === selectedCapClass)
                                      ?.value || 0
                                  : metrics.stockValue
                            }
                            variant="full"
                          />
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
                                  background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                                  <Money value={item.value} variant="full" />
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
                            const color = [THEME.accent, THEME.sage, THEME.gold, THEME.rust][i % 4];
                            const pct = ((item.value / (metrics.stockValue || 1)) * 100).toFixed(1);
                            return (
                              <div
                                key={i}
                                role="button"
                                tabIndex={0}
                                aria-label={`Drill down into ${item.name}`}
                                onMouseEnter={() => setActiveCapIndex(i)}
                                onMouseLeave={() => setActiveCapIndex(null)}
                                onClick={() => setSelectedCapClass(item.name)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setSelectedCapClass(item.name);
                                  }
                                }}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  background: isHovered
                                    ? `color-mix(in srgb, ${THEME.ink} 5%, transparent)`
                                    : `color-mix(in srgb, ${THEME.ink} 2%, transparent)`,
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
                                  <Money value={item.value} variant="full" />
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
                  background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                  borderRadius: 12,
                }}
              >
                Add stocks in the Demat tab to see top holdings breakdown
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
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
                      background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                          <Money value={h.totalValue} variant="full" />
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
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 600,
                    color:
                      passiveIncomeData.passiveRatio >= 50
                        ? THEME.sage
                        : passiveIncomeData.passiveRatio >= 20
                          ? THEME.gold
                          : THEME.rust,
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
                gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-sm), 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {[
                {
                  label: "Rental / Mo",
                  value: passiveIncomeData.rentalMonthly,
                  icon: Building2,
                  color: THEME.sage,
                  bg: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                },
                {
                  label: "FD Yield / Mo",
                  value: passiveIncomeData.fdMonthly,
                  icon: Landmark,
                  color: THEME.gold,
                  bg: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
                },
                {
                  label: "RD Yield / Mo",
                  value: passiveIncomeData.rdMonthly,
                  icon: Activity,
                  color: THEME.cyan,
                  bg: `color-mix(in srgb, ${THEME.cyan} 8%, transparent)`,
                },
                {
                  label: "Savings Int. / Mo",
                  value: passiveIncomeData.savingsMonthly,
                  icon: Receipt,
                  color: THEME.sage,
                  bg: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                },
                {
                  label: "Stock Divs / Mo",
                  value: passiveIncomeData.stockDividendsMonthly,
                  icon: TrendingUp,
                  color: THEME.accent,
                  bg: `color-mix(in srgb, var(--t-accent) 8%, transparent)`,
                },
                {
                  label: "MF Yield / Mo",
                  value: passiveIncomeData.mfYieldMonthly,
                  icon: Zap,
                  color: THEME.violet,
                  bg: `color-mix(in srgb, ${THEME.violet} 8%, transparent)`,
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  style={{
                    padding: 14,
                    background: bg,
                    borderRadius: 12,
                    border: `1px solid color-mix(in srgb, ${color} 11%, transparent)`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 8,
                      minHeight: 24,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
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
                        lineHeight: 1.3,
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
                    <Money value={value} variant="full" />
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "14px 16px",
                background: `color-mix(in srgb, ${THEME.ink} 4%, transparent)`,
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
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 600,
                    color: THEME.sage,
                    letterSpacing: "-0.02em",
                  }}
                >
                  <Money value={passiveIncomeData.totalPassive} variant="full" />
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
              const realEstate = metrics.realEstateAsset || 0;
              const other = Math.max(
                0,
                (metrics.totalAssets || 0) - equity - debt - cash - realEstate
              );
              const total = equity + debt + cash + realEstate + other;

              const actual = {
                equity: total > 0 ? (equity / total) * 100 : 0,
                debt: total > 0 ? (debt / total) * 100 : 0,
                cash: total > 0 ? (cash / total) * 100 : 0,
                realEstate: total > 0 ? (realEstate / total) * 100 : 0,
                other: total > 0 ? (other / total) * 100 : 0,
              };

              const classes = [
                {
                  key: "equity",
                  label: "Equity",
                  actualPct: actual.equity,
                  actualVal: equity,
                  color: ASSET_CLASS_COLORS.Equity,
                  icon: TrendingUp,
                },
                {
                  key: "debt",
                  label: "Debt",
                  actualPct: actual.debt,
                  actualVal: debt,
                  color: ASSET_CLASS_COLORS.Debt,
                  icon: Landmark,
                },
                {
                  key: "cash",
                  label: "Cash",
                  actualPct: actual.cash,
                  actualVal: cash,
                  color: ASSET_CLASS_COLORS.Cash,
                  icon: Activity,
                },
                {
                  key: "realEstate",
                  label: "Real Estate",
                  actualPct: actual.realEstate,
                  actualVal: realEstate,
                  color: ASSET_CLASS_COLORS["Real Estate"],
                  icon: Building2,
                },
                {
                  key: "other",
                  label: "Other",
                  actualPct: actual.other,
                  actualVal: other,
                  color: THEME.muted,
                  icon: Receipt,
                },
              ] as const;

              const totalTarget =
                rebalTargets.equity +
                rebalTargets.debt +
                rebalTargets.cash +
                (rebalTargets.realEstate || 0) +
                rebalTargets.other;

              return (
                <>
                  {/* Sliders */}
                  <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                    {classes.map(({ key, label, actualPct, color }) => {
                      const targetPct = rebalTargets[key] ?? 0;
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
                                  aria-label={`${label} target allocation percent`}
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
                                    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                                    background: `color-mix(in srgb, ${color} 8%, transparent)`,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color,
                                    outline: "none",
                                    textAlign: "center" as const,
                                  }}
                                />
                                <span style={{ fontSize: 12, color }}>%</span>
                              </div>
                              {(() => {
                                const drift = actualPct - targetPct;
                                const absDrift = Math.abs(drift);
                                const driftColor =
                                  absDrift <= 2
                                    ? THEME.sage
                                    : absDrift <= 5
                                      ? THEME.gold
                                      : THEME.rust;
                                return (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 7px",
                                      borderRadius: 6,
                                      background: `color-mix(in srgb, ${driftColor} 9%, transparent)`,
                                      color: driftColor,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {drift >= 0 ? "+" : ""}
                                    {drift.toFixed(1)}%
                                  </span>
                                );
                              })()}
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
                          const targetPct = rebalTargets[key] ?? 0;
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
                                background: isBuy
                                  ? `color-mix(in srgb, var(--t-sage) 4%, transparent)`
                                  : `color-mix(in srgb, var(--t-rust) 4%, transparent)`,
                                border: `1px solid ${isBuy ? `color-mix(in srgb, var(--t-sage) 15%, transparent)` : `color-mix(in srgb, var(--t-rust) 12%, transparent)`}`,
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: 10,
                                    height: 10,
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
                                  <Money value={absDiff} variant="full" />
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
                            Math.abs(((rebalTargets[key] ?? 0) / 100) * total - actualVal) < 1000
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

                  {/* ── Rebalance with New Money ── */}
                  <div
                    style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 16, marginTop: 16 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: rebalWithNewMoney ? 14 : 0,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: THEME.muted,
                            fontWeight: 700,
                            textTransform: "uppercase" as const,
                            letterSpacing: "0.05em",
                          }}
                        >
                          Deploy New Money
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          Reduce drift without selling — allocate fresh capital
                        </div>
                      </div>
                      <button
                        onClick={() => setRebalWithNewMoney((v) => !v)}
                        role="switch"
                        aria-checked={rebalWithNewMoney}
                        aria-label="Rebalance with new money instead of selling"
                        style={{
                          position: "relative",
                          width: 40,
                          height: 22,
                          borderRadius: 11,
                          border: "none",
                          background: rebalWithNewMoney ? THEME.accent : THEME.line,
                          cursor: "pointer",
                          transition: "background 0.2s",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 2,
                            left: rebalWithNewMoney ? 20 : 2,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#fff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                            transition: "left 0.2s",
                          }}
                        />
                      </button>
                    </div>

                    {rebalWithNewMoney && total > 0 && (
                      <>
                        <div style={{ marginBottom: 14 }}>
                          <label
                            htmlFor="rebal-new-investment-amount"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: THEME.muted,
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.05em",
                              display: "block",
                              marginBottom: 6,
                            }}
                          >
                            New Investment Amount
                          </label>
                          <input
                            id="rebal-new-investment-amount"
                            type="number"
                            min="0"
                            value={newInvestAmount}
                            onChange={(e) => setNewInvestAmount(e.target.value)}
                            placeholder="e.g. 50000"
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              background: "var(--surface-0)",
                              border: `1.5px solid ${THEME.line}`,
                              borderRadius: 10,
                              color: THEME.ink,
                              fontSize: 14,
                            }}
                          />
                        </div>

                        {(() => {
                          const amt = Number(newInvestAmount) || 0;
                          if (amt <= 0)
                            return (
                              <div
                                style={{
                                  textAlign: "center",
                                  fontSize: 13,
                                  color: THEME.muted,
                                  padding: "12px 0",
                                }}
                              >
                                Enter an amount to see deployment recommendations
                              </div>
                            );

                          const newTotal = total + amt;
                          const deployments = classes
                            .map(({ key, label, actualVal, color }) => {
                              const targetPct = rebalTargets[key] ?? 0;
                              const idealVal = (targetPct / 100) * newTotal;
                              const deploy = Math.max(0, idealVal - actualVal);
                              return { key, label, color, deploy, targetPct };
                            })
                            .filter((d) => d.deploy > 0);

                          const totalDeploy = deployments.reduce((s, d) => s + d.deploy, 0);
                          const scaled = deployments.map((d) => ({
                            ...d,
                            amount: totalDeploy > 0 ? (d.deploy / totalDeploy) * amt : 0,
                          }));

                          return (
                            <div style={{ display: "grid", gap: 10 }}>
                              {scaled.map(({ key, label, color, amount, targetPct }) => (
                                <div
                                  key={key}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 14,
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    background: `color-mix(in srgb, ${color} 4%, transparent)`,
                                    border: `1px solid color-mix(in srgb, ${color} 15%, transparent)`,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 34,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <ArrowUpRight size={20} style={{ color }} />
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                                      Deploy to {label}
                                    </div>
                                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                                      Target {targetPct}% — reduces drift
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <div
                                      style={{ fontSize: 14, fontWeight: 800, color: THEME.sage }}
                                    >
                                      +<Money value={amount} variant="full" />
                                    </div>
                                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                                      {((amount / amt) * 100).toFixed(0)}% of new capital
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {scaled.length === 0 && (
                                <div
                                  style={{
                                    textAlign: "center",
                                    fontSize: 13,
                                    color: THEME.sage,
                                    padding: "12px 0",
                                  }}
                                >
                                  Portfolio is already at target — invest equally or adjust targets
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </Card>

          {/* ── Portfolio Overlap Analyzer ── */}
          {(() => {
            const INDEX_HOLDINGS: Record<string, { name: string; weight: number }[]> = {
              "Nifty 50": [
                { name: "HDFC Bank", weight: 11.5 },
                { name: "Reliance", weight: 9.7 },
                { name: "ICICI Bank", weight: 7.5 },
                { name: "Infosys", weight: 5.8 },
                { name: "ITC", weight: 4.3 },
                { name: "TCS", weight: 3.8 },
                { name: "L&T", weight: 3.6 },
                { name: "SBI", weight: 3.2 },
                { name: "Kotak Bank", weight: 2.9 },
              ],
              "Nifty Next 50": [
                { name: "HAL", weight: 4.5 },
                { name: "IOC", weight: 4.2 },
                { name: "BPCL", weight: 3.8 },
                { name: "Siemens", weight: 3.6 },
                { name: "Zomato", weight: 3.5 },
                { name: "DLF", weight: 3.4 },
                { name: "Vedanta", weight: 3.2 },
                { name: "ABB India", weight: 3.0 },
                { name: "Trent", weight: 2.8 },
                { name: "Mankind", weight: 2.5 },
              ],
              Sensex: [
                { name: "HDFC Bank", weight: 13.2 },
                { name: "Reliance", weight: 11.2 },
                { name: "ICICI Bank", weight: 8.6 },
                { name: "Infosys", weight: 6.7 },
                { name: "TCS", weight: 4.4 },
                { name: "Bharti Airtel", weight: 4.2 },
                { name: "ITC", weight: 5.0 },
                { name: "L&T", weight: 4.1 },
                { name: "SBI", weight: 3.7 },
                { name: "HUL", weight: 3.1 },
              ],
            };

            const STOCK_MAP: Record<string, string> = {
              INFY: "INFOSYS",
              SBIN: "SBI",
              HDFCBANK: "HDFC BANK",
              ICICIBANK: "ICICI BANK",
              KOTAKBANK: "KOTAK BANK",
              LT: "L&T",
              HINDUNILVR: "HUL",
              VEDL: "VEDANTA",
              ABB: "ABB INDIA",
              BHARTIAIRTEL: "BHARTI AIRTEL",
            };

            const stockMatchesHolding = (symbol: string, holding: string) => {
              const symUp = symbol.toUpperCase().trim();
              const holdUp = holding.toUpperCase().trim();
              if (symUp === holdUp) return true;

              const mapped = STOCK_MAP[symUp];
              if (mapped && (mapped.includes(holdUp) || holdUp.includes(mapped))) return true;

              const symClean = symUp.replace(/[^A-Z0-9]/g, "");
              const holdClean = holdUp.replace(/[^A-Z0-9]/g, "");

              if (symClean.includes(holdClean) || holdClean.includes(symClean)) return true;
              return false;
            };

            const mfs = (state.mutualFunds || []).map((m: any) => {
              const mfName = m.name || m.scheme || "Mutual Fund";
              const units = Number(m.units || 0);
              const nav = Number(m.currentNav || m.buyNav || 0);
              const value = units * nav;

              // Auto-detect index holdings
              let matchedIndex: string | null = null;
              const nameUpper = mfName.toUpperCase();
              if (nameUpper.includes("NIFTY NEXT 50") || nameUpper.includes("NIFTY JUNIOR")) {
                matchedIndex = "Nifty Next 50";
              } else if (nameUpper.includes("NIFTY 50") || nameUpper.includes("NIFTY50")) {
                matchedIndex = "Nifty 50";
              } else if (nameUpper.includes("SENSEX")) {
                matchedIndex = "Sensex";
              }
              // Note: funds with "INDEX" in the name but no specific match above
              // (e.g. Nasdaq 100, Midcap 150, Smallcap 250 index funds) are left
              // unmatched rather than defaulted to Nifty 50 — they track a different
              // set of constituents entirely and would produce false overlap results.

              const holdings = matchedIndex ? INDEX_HOLDINGS[matchedIndex] || [] : [];
              return { name: mfName, value, matchedIndex, holdings };
            });

            // Get user's direct stocks with values
            const userStocks = (state.stocks || [])
              .map((s: any) => {
                const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "");
                const qty = Number(s.qty || 0);
                const price = Number(s.currentPrice || s.avgPrice || 0);
                return { symbol: base, value: qty * price };
              })
              .filter((s: any) => s.symbol && s.value > 0);

            const directStockMap: Record<string, number> = {};
            userStocks.forEach((s) => {
              const sym = s.symbol.toUpperCase();
              directStockMap[sym] = (directStockMap[sym] || 0) + s.value;
            });
            const uniqueStockNames = Object.keys(directStockMap);

            // Find overlaps
            const overlapMap: Record<
              string,
              {
                directValue: number;
                indirectValue: number;
                funds: { name: string; estimatedValue: number }[];
              }
            > = {};

            Object.entries(directStockMap).forEach(([stockSymbol, directVal]) => {
              mfs.forEach((mf: any) => {
                if (mf.holdings.length === 0) return;
                mf.holdings.forEach((h: any) => {
                  if (stockMatchesHolding(stockSymbol, h.name)) {
                    if (!overlapMap[stockSymbol]) {
                      overlapMap[stockSymbol] = {
                        directValue: directVal,
                        indirectValue: 0,
                        funds: [],
                      };
                    }
                    const estVal = (mf.value * h.weight) / 100;
                    overlapMap[stockSymbol].indirectValue += estVal;
                    overlapMap[stockSymbol].funds.push({
                      name: mf.name,
                      estimatedValue: estVal,
                    });
                  }
                });
              });
            });

            const overlapEntries = Object.entries(overlapMap).sort(
              (a, b) =>
                b[1].directValue + b[1].indirectValue - (a[1].directValue + a[1].indirectValue)
            );
            const overlappingStockCount = overlapEntries.length;
            const fundsWithOverlap = new Set(
              overlapEntries.flatMap(([, data]) => data.funds.map((f) => f.name))
            ).size;
            const totalOverlapValue = overlapEntries.reduce(
              (sum, [, data]) => sum + data.indirectValue,
              0
            );

            // Concentration risk if a stock is in 3+ funds or indirect exposure is > 150000
            const concentrationRisks = overlapEntries.filter(
              ([, data]) => data.funds.length >= 3 || data.indirectValue > 150000
            );

            if (mfs.length === 0 && uniqueStockNames.length === 0) return null;

            return (
              <Card
                style={{
                  padding: 24,
                  marginTop: 28,
                  borderTop: `3px solid ${concentrationRisks.length > 0 ? THEME.rust : THEME.sage}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div className="section-label" style={{ marginBottom: 4 }}>
                      Portfolio Overlap Analyzer
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted }}>
                      Detect dual exposure between your direct stock holdings and mutual funds
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4, fontStyle: "italic" }}>
                      Index constituent weights are static estimates, not live data — treat as directional
                    </div>
                  </div>
                  {overlappingStockCount > 0 && (
                    <Badge variant={concentrationRisks.length > 0 ? "rust" : "gold"}>
                      {overlappingStockCount} Overlapping Stock
                      {overlappingStockCount !== 1 ? "s" : ""} Detected
                    </Badge>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
                    gap: 24,
                  }}
                >
                  {/* Left Column: Mutual Funds List */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 10,
                        }}
                      >
                        Mutual Funds & Index Matching
                      </div>
                      {mfs.length > 0 ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {mfs.map((mf: any, i: number) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                                border: `1px solid ${THEME.line}`,
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: THEME.ink,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {mf.name}
                                </div>
                                {mf.matchedIndex ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      marginTop: 4,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "1px 8px",
                                        borderRadius: "var(--radius-xs)",
                                        background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                                        color: THEME.accent,
                                      }}
                                    >
                                      {mf.matchedIndex}
                                    </span>
                                    <span style={{ fontSize: 10, color: THEME.muted }}>
                                      {mf.holdings.length} holdings tracked
                                    </span>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                                    Active / Sector Fund (No index mapping)
                                  </div>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: THEME.ink,
                                  flexShrink: 0,
                                  marginLeft: 12,
                                }}
                              >
                                <Money value={mf.value} variant="full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                          No mutual funds added yet — add them from the Investments tab.
                        </div>
                      )}
                    </div>

                    {/* Overall Summary Stats */}
                    {overlappingStockCount > 0 && (
                      <div
                        style={{
                          background: `color-mix(in srgb, ${THEME.accent} 5%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                          borderRadius: 12,
                          padding: "14px 16px",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 2 }}>
                            Indirect Overlap Exposure
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.accent }}>
                            <Money value={totalOverlapValue} variant="full" />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 2 }}>
                            Affected Funds
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                            {fundsWithOverlap} / {mfs.filter((f) => f.matchedIndex).length} Funds
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Overlap Detections */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 10,
                      }}
                    >
                      Detections & Concentration Risks
                    </div>

                    {overlapEntries.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div
                          style={{
                            display: "grid",
                            gap: 8,
                            maxHeight: 300,
                            overflowY: "auto",
                            paddingRight: 4,
                          }}
                        >
                          {overlapEntries.map(([stock, data]) => {
                            const isConcentration =
                              data.funds.length >= 3 || data.indirectValue > 150000;
                            const totalExposure = data.directValue + data.indirectValue;
                            return (
                              <div
                                key={stock}
                                style={{
                                  padding: "12px 14px",
                                  borderRadius: 10,
                                  background: isConcentration
                                    ? `color-mix(in srgb, ${THEME.rust} 5%, transparent)`
                                    : `color-mix(in srgb, ${THEME.ink} 2%, transparent)`,
                                  border: `1px solid ${isConcentration ? `color-mix(in srgb, ${THEME.rust} 20%, transparent)` : THEME.line}`,
                                  borderLeft: isConcentration
                                    ? `3px solid ${THEME.rust}`
                                    : undefined,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 6,
                                  }}
                                >
                                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                                    {stock}
                                  </div>
                                  {isConcentration && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        padding: "2px 8px",
                                        borderRadius: "var(--radius-xs)",
                                        background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                                        color: THEME.rust,
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      High Concentration
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr 1fr",
                                    gap: 10,
                                    marginBottom: 6,
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{ fontSize: 9, color: THEME.muted, marginBottom: 1 }}
                                    >
                                      Direct Holding
                                    </div>
                                    <div
                                      style={{ fontSize: 11, fontWeight: 700, color: THEME.ink }}
                                    >
                                      <Money value={data.directValue} variant="full" />
                                    </div>
                                  </div>
                                  <div>
                                    <div
                                      style={{ fontSize: 9, color: THEME.muted, marginBottom: 1 }}
                                    >
                                      Indirect (via Funds)
                                    </div>
                                    <div
                                      style={{ fontSize: 11, fontWeight: 700, color: THEME.accent }}
                                    >
                                      <Money value={data.indirectValue} variant="full" />
                                    </div>
                                  </div>
                                  <div>
                                    <div
                                      style={{ fontSize: 9, color: THEME.muted, marginBottom: 1 }}
                                    >
                                      Total Exposure
                                    </div>
                                    <div
                                      style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}
                                    >
                                      <Money value={totalExposure} variant="full" />
                                    </div>
                                  </div>
                                </div>
                                <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 4 }}>
                                  Appears in:
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {data.funds.map((f: any, fi: number) => (
                                    <span
                                      key={fi}
                                      style={{
                                        fontSize: 10,
                                        color: THEME.muted,
                                        background: `color-mix(in srgb, ${THEME.ink} 4%, transparent)`,
                                        borderRadius: 6,
                                        padding: "3px 7px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      <span style={{ fontWeight: 600, color: THEME.ink }}>
                                        {f.name.length > 22 ? f.name.slice(0, 22) + "..." : f.name}
                                      </span>{" "}
                                      (Est: <Money value={f.estimatedValue} variant="full" />)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {concentrationRisks.length > 0 && (
                          <div
                            style={{
                              padding: "10px 14px",
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${THEME.rust} 5%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                              fontSize: 12,
                              color: THEME.rust,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <AlertTriangle size={14} />
                            <span>
                              {concentrationRisks.length} stock
                              {concentrationRisks.length !== 1 ? "s" : ""} have high overlap.
                              Consider reducing direct purchases to avoid compounding risk.
                            </span>
                          </div>
                        )}
                      </div>
                    ) : uniqueStockNames.length > 0 &&
                      mfs.some((m: any) => m.holdings.length > 0) ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "30px 20px",
                          color: THEME.sage,
                          fontSize: 13,
                          fontWeight: 600,
                          background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                          borderRadius: 12,
                          border: `1px dashed color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                        }}
                      >
                        ✓ Excellent! Your direct stocks have zero overlap with tracked index fund
                        holdings.
                      </div>
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "30px 20px",
                          color: THEME.muted,
                          fontSize: 12,
                          background: `color-mix(in srgb, ${THEME.ink} 2%, transparent)`,
                          borderRadius: 12,
                          border: `1px dashed ${THEME.line}`,
                        }}
                      >
                        {uniqueStockNames.length === 0
                          ? "Add direct stocks in Demat & Stocks tab to check overlap with index funds."
                          : "No tracked index funds detected. Overlap analysis requires Nifty 50, Nifty Next 50, or Sensex index funds."}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* ────────── Net Worth Percentile ────────── */}
          {(() => {
            // Age-banded percentile benchmarks for Indian upper-middle-class (salaried/professional)
            // Based on PRICE ICE360, Credit Suisse Global Wealth Report & CMIE CPHS estimates (2024)
            const BANDS: {
              age: [number, number];
              p25: number;
              p50: number;
              p75: number;
              p90: number;
              p95: number;
            }[] = [
              { age: [20, 25], p25: 100000, p50: 300000, p75: 800000, p90: 2000000, p95: 4000000 },
              {
                age: [25, 30],
                p25: 300000,
                p50: 800000,
                p75: 2000000,
                p90: 5000000,
                p95: 10000000,
              },
              {
                age: [30, 35],
                p25: 800000,
                p50: 2000000,
                p75: 5000000,
                p90: 12000000,
                p95: 25000000,
              },
              {
                age: [35, 40],
                p25: 1500000,
                p50: 4000000,
                p75: 10000000,
                p90: 25000000,
                p95: 50000000,
              },
              {
                age: [40, 45],
                p25: 2500000,
                p50: 7000000,
                p75: 18000000,
                p90: 40000000,
                p95: 80000000,
              },
              {
                age: [45, 50],
                p25: 4000000,
                p50: 10000000,
                p75: 25000000,
                p90: 55000000,
                p95: 110000000,
              },
              {
                age: [50, 55],
                p25: 5000000,
                p50: 13000000,
                p75: 32000000,
                p90: 70000000,
                p95: 140000000,
              },
              {
                age: [55, 65],
                p25: 6000000,
                p50: 16000000,
                p75: 40000000,
                p90: 90000000,
                p95: 180000000,
              },
            ];
            const nw = metrics.netWorth || 0;
            const ageInput = nwPercentileAge;
            const setAgeInput = setNwPercentileAge;
            const band =
              BANDS.find((b) => ageInput >= b.age[0] && ageInput < b.age[1]) ||
              BANDS[BANDS.length - 1];

            let pct = 0;
            if (nw <= 0) pct = 0;
            else if (nw < band.p25) pct = Math.round((nw / band.p25) * 25);
            else if (nw < band.p50)
              pct = 25 + Math.round(((nw - band.p25) / (band.p50 - band.p25)) * 25);
            else if (nw < band.p75)
              pct = 50 + Math.round(((nw - band.p50) / (band.p75 - band.p50)) * 25);
            else if (nw < band.p90)
              pct = 75 + Math.round(((nw - band.p75) / (band.p90 - band.p75)) * 15);
            else if (nw < band.p95)
              pct = 90 + Math.round(((nw - band.p90) / (band.p95 - band.p90)) * 5);
            else pct = 95 + Math.min(4, Math.round(((nw - band.p95) / band.p95) * 10));
            pct = Math.min(99, Math.max(0, pct));

            const label =
              pct >= 95
                ? "Top 5%"
                : pct >= 90
                  ? "Top 10%"
                  : pct >= 75
                    ? "Top 25%"
                    : pct >= 50
                      ? "Top 50%"
                      : "Below Median";
            const color =
              pct >= 90
                ? THEME.gold
                : pct >= 75
                  ? THEME.sage
                  : pct >= 50
                    ? THEME.accent
                    : THEME.muted;
            const milestones = [
              { label: "25th", value: band.p25, pct: 25 },
              { label: "50th", value: band.p50, pct: 50 },
              { label: "75th", value: band.p75, pct: 75 },
              { label: "90th", value: band.p90, pct: 90 },
              { label: "95th", value: band.p95, pct: 95 },
            ];
            const nextMilestone = milestones.find((m) => nw < m.value);

            return (
              <Card style={{ padding: 24, marginTop: 24, borderTop: `3px solid ${THEME.accent}` }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  <div>
                    <div className="section-label" style={{ marginBottom: 4 }}>
                      Net Worth Percentile
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted }}>
                      Where your wealth stands among Indian professionals · benchmarks from PRICE
                      ICE360 & Credit Suisse (2024)
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: `color-mix(in srgb, ${THEME.ink} 4%, transparent)`,
                      padding: "6px 14px",
                      borderRadius: "var(--radius-xs)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <span style={{ fontSize: 13, color: THEME.ink, fontWeight: 700 }}>
                      Age: {ageInput}
                    </span>
                    <input
                      type="range"
                      aria-label="Age"
                      aria-valuetext={`${ageInput} years`}
                      min={20}
                      max={65}
                      step={1}
                      value={ageInput}
                      onChange={(e) => setAgeInput(Number(e.target.value))}
                      style={{
                        accentColor: THEME.accent,
                        cursor: "pointer",
                        width: 110,
                        height: 5,
                        borderRadius: 3,
                        background: THEME.line,
                      }}
                    />
                  </div>
                </div>

                {/* Big percentile display */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    marginBottom: 24,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ textAlign: "center", minWidth: 100 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 600, color, lineHeight: 1 }}>
                      {pct}th
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>percentile</div>
                    <div style={{ marginTop: 8 }}>
                      <span
                        style={{
                          background: `color-mix(in srgb, ${color} 9%, transparent)`,
                          color,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "var(--radius-xs)",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {/* Progress bar */}
                    <div
                      style={{
                        position: "relative",
                        height: 20,
                        background: `${THEME.line}`,
                        borderRadius: 10,
                        overflow: "hidden",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${THEME.accent}, ${color})`,
                          borderRadius: 10,
                          transition: "width 0.5s ease",
                        }}
                      />
                      {/* Milestone ticks */}
                      {[25, 50, 75, 90, 95].map((p) => (
                        <div
                          key={p}
                          style={{
                            position: "absolute",
                            left: `${p}%`,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: `color-mix(in srgb, ${THEME.ink} 22%, transparent)`,
                            transform: "translateX(-50%)",
                          }}
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        position: "relative",
                        height: 16,
                        color: THEME.muted,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ position: "absolute", left: 0, transform: "none" }}>0</span>
                      {[25, 50, 75, 90, 95].map((p) => (
                        <span
                          key={p}
                          style={{
                            position: "absolute",
                            left: `${p}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          {p}th
                        </span>
                      ))}
                      <span style={{ position: "absolute", right: 0, transform: "none" }}>99+</span>
                    </div>
                  </div>
                </div>

                {/* Milestone table */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-sm), 1fr))",
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  {milestones.map((m) => (
                    <div
                      key={m.label}
                      className="card-lift"
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background:
                          nw >= m.value
                            ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                            : `var(--surface-1)`,
                        border: `1px solid ${nw >= m.value ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)` : THEME.line}`,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 2 }}>
                        {m.label} pctl (age {ageInput})
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: nw >= m.value ? THEME.sage : THEME.ink,
                        }}
                      >
                        {m.value >= 10000000
                          ? `₹${(m.value / 10000000).toFixed(1)}Cr`
                          : `₹${(m.value / 100000).toFixed(0)}L`}
                      </div>
                      {nw >= m.value && (
                        <div
                          style={{
                            fontSize: 10,
                            color: THEME.sage,
                            marginTop: 4,
                            fontWeight: 600,
                          }}
                        >
                          ✓ Achieved
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Next milestone */}
                {nextMilestone && (
                  <div
                    style={{
                      background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      fontSize: 13,
                      color: THEME.ink,
                      fontWeight: 500,
                    }}
                  >
                    <strong style={{ color: THEME.accent }}>Next milestone:</strong>{" "}
                    {nextMilestone.pct}th percentile —{" "}
                    {nextMilestone.value >= 10000000
                      ? `₹${(nextMilestone.value / 10000000).toFixed(1)}Cr`
                      : `₹${(nextMilestone.value / 100000).toFixed(0)}L`}
                    . Need{" "}
                    <strong style={{ color: THEME.accent }}>
                      <Prv>
                        {nextMilestone.value - nw >= 10000000
                          ? `₹${((nextMilestone.value - nw) / 10000000).toFixed(1)}Cr`
                          : `₹${Math.max(0, (nextMilestone.value - nw) / 100000).toFixed(0)}L`}
                      </Prv>
                    </strong>{" "}
                    more.
                  </div>
                )}
                <div
                  style={{ fontSize: 10, color: THEME.muted, marginTop: 12, fontStyle: "italic" }}
                >
                  * Benchmarks are estimates for Indian urban professionals. Percentile reflects
                  household net worth (assets minus liabilities), not income.
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* ────────────────── SUB-TAB: PLANNING (NEW!) ────────────────── */}
      {sub === "planning" && (
        <div key="planning" className="tab-content-enter">
          {/* Hero Header */}
          <div className="sub-tab-hero animate-fade-in">
            <span className="sub-tab-hero-icon">
              <Target size={28} />
            </span>
            <div className="sub-tab-hero-body">
              <div className="sub-tab-hero-title">Financial Planning</div>
              <div className="sub-tab-hero-desc">
                FIRE progress, SIP planner, loan EMI tracker, retirement corpus and goal milestones
              </div>
            </div>
            <div className="sub-tab-hero-badge">
              <Rocket size={12} /> FIRE &amp; Goals
            </div>
          </div>
          {/* FIRE Progress */}
          <Card style={{ padding: 24, marginBottom: 28, borderTop: `3px solid ${THEME.accent}` }}>
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
                  25× annual expenses rule (4% withdrawal, today's spend) · open FIRE
                  Planner for an inflation- and age-adjusted projection
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 600,
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
                    gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-md), 1fr))",
                    gap: 14,
                  }}
                >
                  {[
                    {
                      label: "FIRE Corpus Needed",
                      value: <Money value={fireData.fireCorpus} variant="full" />,
                      sub: `25 × annual spend`,
                      color: THEME.ink,
                    },
                    {
                      label: "Annual Spend",
                      value: <Money value={fireData.annualExpense} variant="full" />,
                      sub: `${privacyMode ? "••••" : fmtINRFull(metrics.monthExpense)}/mo`,
                      color: THEME.ink,
                    },
                    {
                      label: "Current Net Worth",
                      value: <Money value={metrics.netWorth} variant="full" />,
                      sub: "your wealth base",
                      color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust,
                    },
                    {
                      label: "Remaining to FIRE",
                      value:
                        fireData.fireCorpus > metrics.netWorth ? (
                          <Money value={fireData.fireCorpus - Math.max(metrics.netWorth, 0)} variant="full" />
                        ) : (
                          "FI Achieved!"
                        ),
                      sub:
                        fireData.fireCorpus > metrics.netWorth ? "gap to close" : "congratulations",
                      color: fireData.fireCorpus > metrics.netWorth ? THEME.rust : THEME.sage,
                    },
                  ].map(({ label, value, sub, color }) => (
                    <div
                      key={label}
                      style={{
                        padding: "14px 16px",
                        background: `color-mix(in srgb, ${THEME.ink} 4%, transparent)`,
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
                          lineHeight: 1.3,
                          minHeight: 26,
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
                  background: `color-mix(in srgb, var(--t-accent) 6%, transparent)`,
                  borderRadius: 12,
                  border: `1px solid color-mix(in srgb, var(--t-accent) 18%, transparent)`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.accent,
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
                      aria-label="Extra monthly investment amount"
                      value={fireWhatIfExtra || ""}
                      onChange={(e) => setFireWhatIfExtra(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="e.g. 10000"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `1px solid color-mix(in srgb, var(--t-accent) 30%, transparent)`,
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
                        aria-pressed={fireWhatIfExtra === preset.val}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: `1px solid color-mix(in srgb, var(--t-accent) 24%, transparent)`,
                          background:
                            fireWhatIfExtra === preset.val
                              ? `color-mix(in srgb, var(--t-accent) 14%, transparent)`
                              : "transparent",
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
                    // Annuity-due (SIP debited at start of month) — matches SIP vs Lump Sum planner below
                    const months =
                      Math.log(1 + (gap * r) / (totalSavings * (1 + r))) / Math.log(1 + r);
                    const years = months / 12;
                    const baseYrs =
                      currentSavings > 0
                        ? Math.log(1 + (gap * r) / (currentSavings * (1 + r))) /
                          Math.log(1 + r) /
                          12
                        : null;
                    const saved = baseYrs !== null && isFinite(baseYrs) ? baseYrs - years : null;
                    return isFinite(years) && years > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 20,
                          padding: "10px 16px",
                          background: `color-mix(in srgb, var(--t-accent) 8%, transparent)`,
                          borderRadius: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 26,
                              fontWeight: 600,
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
                      fontFamily: "var(--font-display)",
                      fontSize: 24,
                      fontWeight: 600,
                      color: THEME.sage,
                      letterSpacing: "-0.02em",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      justifyContent: "flex-end",
                    }}
                  >
                    <Target size={20} /> {crossoverYear}
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg), 1fr))",
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
                    background: `color-mix(in srgb, ${THEME.ink} 2%, transparent)`,
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
                      aria-label="Equities Return CAGR"
                      aria-valuetext={`${eqCAGR}%`}
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
                      aria-label="Fixed Income Return"
                      aria-valuetext={`${fiCAGR}%`}
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
                      aria-label="Expected Inflation"
                      aria-valuetext={`${inflationRate}%`}
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
                        {windfallAmount > 0 ? <Money value={windfallAmount} variant="full" /> : "None"}
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
                        aria-label="One-time windfall amount"
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
                            aria-label="Windfall year"
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
                          aria-pressed={windfallAmount === preset.val}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: `1px solid color-mix(in srgb, var(--t-sage) 20%, transparent)`,
                            background:
                              windfallAmount === preset.val
                                ? `color-mix(in srgb, var(--t-sage) 10%, transparent)`
                                : "transparent",
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
                        {extraExpenseAmount > 0 ? <Money value={extraExpenseAmount} variant="full" /> : "None"}
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
                        aria-label="One-time major expense amount"
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
                            aria-label="Major expense year"
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
                          aria-pressed={extraExpenseAmount === preset.val}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: `1px solid color-mix(in srgb, var(--t-rust) 20%, transparent)`,
                            background:
                              extraExpenseAmount === preset.val
                                ? `color-mix(in srgb, var(--t-rust) 10%, transparent)`
                                : "transparent",
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
                      background: `color-mix(in srgb, ${THEME.ink} 1%, transparent)`,
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 16,
                      padding: "16px 12px 6px",
                    }}
                  >
                    <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart
                        data={projectionData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="projColorNet" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor={THEME.accent}
                              stopOpacity={isDark ? 0.35 : 0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor={THEME.accent}
                              stopOpacity={isDark ? 0.05 : 0.0}
                            />
                          </linearGradient>
                          <linearGradient id="projColorReal" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor={THEME.sage}
                              stopOpacity={isDark ? 0.3 : 0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor={THEME.sage}
                              stopOpacity={isDark ? 0.05 : 0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={`color-mix(in srgb, var(--t-line) 50%, transparent)`}
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
                          tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                          width={85}
                        />
                        <Tooltip
                          cursor={{ stroke: THEME.line }}
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 12,
                            boxShadow: "var(--shadow-md)",
                            color: THEME.ink,
                            fontSize: 13,
                          }}
                          labelStyle={{ color: THEME.muted }}
                          itemStyle={{ color: THEME.ink }}
                          formatter={(value: any, name: string) => {
                            const labelMap: Record<string, string> = {
                              netWorth: "Nominal Net Worth",
                              realNetWorth: "Real (Inflation Adj.)",
                              fireTarget: "FIRE Goal Post",
                            };
                            return [
                              privacyMode ? "••••" : fmtINRFull(Number(value)),
                              labelMap[name] || name,
                            ];
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
                    </ResponsiveContainer></div>
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
                  background: crossoverYear
                    ? `color-mix(in srgb, var(--t-sage) 6%, transparent)`
                    : `color-mix(in srgb, var(--t-gold) 6%, transparent)`,
                  border: `1px solid ${crossoverYear ? `color-mix(in srgb, var(--t-sage) 18%, transparent)` : `color-mix(in srgb, var(--t-gold) 18%, transparent)`}`,
                  borderRadius: 12,
                }}
              >
                {crossoverYear ? (
                  <Rocket size={24} color={THEME.sage} style={{ flexShrink: 0 }} />
                ) : (
                  <Lightbulb size={24} color={THEME.gold} style={{ flexShrink: 0 }} />
                )}
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
                          return `With Equities compounding at ${eqCAGR}% and Fixed Income at ${fiCAGR}%, your wealth is projected to outpace your inflation-adjusted FIRE corpus requirement of ${
                            privacyMode
                              ? "••••"
                              : fmtINRFull(projectionData[yrsAway]?.fireTarget || 0)
                          } ${timeStr}. Adjust the monthly savings input above to accelerate this vector!`;
                        })()
                      : `At the current growth trajectory, inflation (${inflationRate}%) is challenging your real wealth growth vector. Consider increasing your monthly equity SIP investments or seeking higher-yielding asset classes to compound past your goal post within the decade.`}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 80C Tax Deduction */}
          <Card style={{ padding: 24, marginBottom: 28, borderTop: `3px solid ${THEME.gold}` }}>
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
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 600,
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
                  ? [{ label: "EPF (Employee)", value: taxData80C.epfEmployee, color: THEME.violet }]
                  : []),
                ...(taxData80C.npsContrib > 0
                  ? [
                      {
                        label: "NPS (80CCD(1))",
                        value: taxData80C.npsContrib,
                        color: THEME.cyan || THEME.accent,
                      },
                    ]
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
                  <span style={{ fontWeight: 700 }}>
                    <Money value={value} variant="full" />
                  </span>
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
                  <Money value={taxData80C.remaining} variant="full" />
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
                      background: `color-mix(in srgb, var(--t-sage) 10%, transparent)`,
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
                            fontFamily: "var(--font-display)",
                            fontSize: 32,
                            fontWeight: 600,
                            color: remainingSafe > 0 ? THEME.sage : THEME.rust,
                            letterSpacing: "-0.03em",
                          }}
                        >
                          <Money value={Math.abs(remainingSafe)} variant="full" />
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                          {remainingSafe > 0
                            ? `Keep daily spend below ${privacyMode ? "••••" : fmtINRFull(dailyBudget)} to hit your ${targetPct}% goal`
                            : `You've exceeded your safety limit by ${privacyMode ? "••••" : fmtINRFull(Math.abs(remainingSafe))}`}
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
                            <Money value={income} variant="full" />
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
                            <Money value={spent} variant="full" />
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
                            <Money value={savingsTarget} variant="full" />
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
                                ? `color-mix(in srgb, ${THEME.gold} 45%, ${THEME.rust})`
                                : spendingPct > (100 - targetPct) * 0.8
                                  ? THEME.gold
                                  : spendingPct > 50
                                    ? `color-mix(in srgb, ${THEME.gold} 35%, ${THEME.sage})`
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
                          background: isOverBudget
                            ? `color-mix(in srgb, var(--t-rust) 4%, transparent)`
                            : `color-mix(in srgb, var(--t-sage) 4%, transparent)`,
                          border: `1px solid ${isOverBudget ? `color-mix(in srgb, var(--t-rust) 10%, transparent)` : `color-mix(in srgb, var(--t-sage) 10%, transparent)`}`,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: isOverBudget ? THEME.rust : THEME.sage,
                          fontWeight: 500,
                        }}
                      >
                        {isOverBudget
                          ? "Your spending has eaten into your savings target. Consider deferring non-essential purchases."
                          : "You're pacing well! Staying disciplined now will help you reach your financial milestones faster."}
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
              {goalHealth.length > 0 && goalHealth[0].combinedShortfall > 0 && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                    fontSize: 12,
                    color: THEME.rust,
                    fontWeight: 600,
                    marginBottom: 14,
                    lineHeight: 1.5,
                  }}
                >
                  Your active goals need <Money value={goalHealth[0].totalMonthlyNeeded} variant="full" />
                  /mo combined, but current monthly savings is only{" "}
                  <Money value={Math.max(0, metrics.monthIncome - metrics.monthExpense)} variant="full" /> —
                  short by <Money value={goalHealth[0].combinedShortfall} variant="full" />/mo. Some goals
                  below may look affordable alone but not all can be funded at once.
                </div>
              )}
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
                        background: `color-mix(in srgb, ${THEME.ink} 4%, transparent)`,
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
                            <Money value={g.savedAmount} variant="full" /> of{" "}
                            <Money value={g.targetAmount} variant="full" />
                          </span>
                          {!g.achieved && g.monthsLeft > 0 && (
                            <span
                              style={{
                                color: g.onTrack ? THEME.sage : THEME.rust,
                                fontWeight: 700,
                              }}
                            >
                              Need <Money value={g.monthlyNeeded} variant="full" />/mo ·{" "}
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
              // Parse at local midnight — bare `new Date(s.buyDate)` parses "YYYY-MM-DD"
              // as UTC midnight, which under-counts daysHeld and can flip the STCG/LTCG
              // classification right at the 365-day anniversary boundary.
              const buyDate = s.buyDate ? new Date(s.buyDate + "T00:00:00") : null;
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
              // Local-midnight parse (see losingStocks above) so the STCG/LTCG boundary
              // isn't shifted by the UTC-parse offset.
              const buyDate = m.buyDate ? new Date(m.buyDate + "T00:00:00") : null;
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
              <Card style={{ padding: 24, marginTop: 24, borderTop: `3px solid ${THEME.gold}` }}>
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
                      background: `color-mix(in srgb, var(--t-sage) 3%, transparent)`,
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
                              background: `color-mix(in srgb, var(--t-rust) 4%, transparent)`,
                              borderRadius: 12,
                              border: `1px solid color-mix(in srgb, var(--t-rust) 10%, transparent)`,
                              marginBottom: 20,
                            }}
                          >
                            {[
                              {
                                label: "Harvested Loss",
                                value: <Money value={selectedTotalLoss} variant="full" />,
                                color: THEME.rust,
                              },
                              {
                                label: "Est. Tax Saving",
                                value: <Money value={selectedEstSavings} variant="full" />,
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
                                      ? `color-mix(in srgb, ${THEME.ink} 3%, transparent)`
                                      : `color-mix(in srgb, ${THEME.ink} 1%, transparent)`,
                                    border: `1px solid ${isChecked ? THEME.line : `color-mix(in srgb, ${THEME.ink} 8%, transparent)`}`,
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
                                      display: "flex",
                                      alignItems: "center",
                                      flexShrink: 0,
                                      opacity: isChecked ? 1 : 0.4,
                                    }}
                                  >
                                    {item.type === "Stock" ? (
                                      <TrendingUp
                                        size={20}
                                        color={isChecked ? THEME.rust : THEME.muted}
                                      />
                                    ) : (
                                      <Activity
                                        size={20}
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
                                        −<Money value={item.loss} variant="full" />
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
                        background: `color-mix(in srgb, ${THEME.ink} 4%, transparent)`,
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
                      aria-label="Target corpus"
                      placeholder={`e.g. ${fmtINRFull(5000000)}`}
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
                          aria-pressed={sipLsTarget === preset}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: `1px solid ${THEME.line}`,
                            background:
                              sipLsTarget === preset
                                ? `color-mix(in srgb, var(--t-accent) 12%, transparent)`
                                : "transparent",
                            color: sipLsTarget === preset ? THEME.accent : THEME.muted,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {fmtINRFull(preset)}
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
                      aria-label="Timeline in years"
                      aria-valuetext={`${sipLsYears} year${sipLsYears > 1 ? "s" : ""}`}
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
                      aria-label="Expected CAGR"
                      aria-valuetext={`${sipLsCagr}%`}
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
                        background: `color-mix(in srgb, var(--t-accent) 6%, transparent)`,
                        border: `1.5px solid color-mix(in srgb, var(--t-accent) 25%, transparent)`,
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
                          fontFamily: "var(--font-display)",
                          fontSize: 32,
                          fontWeight: 600,
                          color: THEME.accent,
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                        }}
                      >
                        <Money value={Math.round(sipNeeded)} variant="full" />
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8 }}>
                        Total invested: <Money value={Math.round(sipTotal)} variant="full" />
                      </div>
                      <div
                        style={{ fontSize: 12, color: THEME.sage, marginTop: 4, fontWeight: 600 }}
                      >
                        Gains: <Money value={Math.round(FV - sipTotal)} variant="full" />
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "20px 24px",
                        borderRadius: 14,
                        background: `color-mix(in srgb, ${THEME.ink} 4%, transparent)`,
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
                          fontFamily: "var(--font-display)",
                          fontSize: 32,
                          fontWeight: 600,
                          color: THEME.ink,
                          letterSpacing: "-0.03em",
                          lineHeight: 1,
                        }}
                      >
                        <Money value={Math.round(lumpNeeded)} variant="full" />
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8 }}>
                        Grows to <Money value={FV} variant="full" /> in {sipLsYears}y
                      </div>
                      <div
                        style={{ fontSize: 12, color: THEME.sage, marginTop: 4, fontWeight: 600 }}
                      >
                        Gains: <Money value={Math.round(lumpGrowth)} variant="full" />
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
              {/* Hero Header */}
              <div className="sub-tab-hero animate-fade-in">
                <span className="sub-tab-hero-icon">
                  <CreditCard size={28} />
                </span>
                <div className="sub-tab-hero-body">
                  <div className="sub-tab-hero-title">Spending Analysis</div>
                  <div className="sub-tab-hero-desc">
                    {spendMonthLabel} · Category breakdown, budget tracking and month-over-month
                    comparison
                  </div>
                </div>
                {spendingData.total > 0 && (
                  <div className="sub-tab-hero-badge">
                    <ArrowDownRight size={12} /> <Money value={spendingData.total} variant="full" /> spent
                  </div>
                )}
              </div>

              {/* Premium Month navigation bar */}
              {(() => {
                const prevMonthActualYear = svm === 1 ? svy - 1 : svy;
                const prevMonthActualYm = `${prevMonthActualYear}-${String(svm === 1 ? 12 : svm - 1).padStart(2, "0")}`;
                const prevMonthTxns = (state.transactions || []).filter((t: any) => {
                  const d = (t.date || "").slice(0, 7);
                  return (
                    d === prevMonthActualYm &&
                    t.type === "debit" &&
                    t.category !== "Transfer" &&
                    t.category !== "Self Transfer" &&
                    t.category !== "Self-Transfer"
                  );
                });
                const prevMonthTotal = prevMonthTxns.reduce(
                  (s: number, t: any) => s + Number(t.amount || 0),
                  0
                );
                const spendVsPrev =
                  prevMonthTotal > 0 && spendingData.total > 0
                    ? Math.round(((spendingData.total - prevMonthTotal) / prevMonthTotal) * 100)
                    : null;
                const maxBarVal = Math.max(spendingData.total, prevMonthTotal, 1);
                return (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: "16px 20px",
                      borderRadius: 16,
                      background: isDark ? "var(--surface-1)" : "rgba(255,255,255,0.9)",
                      border: `1px solid ${THEME.line}`,
                      boxShadow: isDark
                        ? "0 2px 12px rgba(0,0,0,0.2)"
                        : "0 2px 12px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* Top row: nav arrows + month title + Today */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: spendingData.total > 0 ? 14 : 0,
                      }}
                    >
                      <button
                        onClick={() => navToMonth(-1)}
                        aria-label="Previous month"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          border: `1.5px solid ${THEME.line}`,
                          background: "transparent",
                          cursor: "pointer",
                          color: THEME.ink,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.accent;
                          (e.currentTarget as HTMLButtonElement).style.background =
                            `color-mix(in srgb, var(--t-accent) 8%, transparent)`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.line;
                          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>

                      {/* Center: month + spend summary */}
                      <div style={{ textAlign: "center", flex: 1, padding: "0 16px" }}>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: THEME.ink,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.1,
                            marginBottom: 2,
                          }}
                        >
                          {spendMonthLabel}
                        </div>
                        {spendingData.total > 0 && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              fontSize: 12,
                              color: THEME.muted,
                              fontWeight: 500,
                            }}
                          >
                            <span style={{ fontWeight: 700, color: THEME.rust }}>
                              <Money value={spendingData.total} variant="full" />
                            </span>
                            {spendVsPrev !== null && (
                              <span
                                style={{
                                  padding: "1px 7px",
                                  borderRadius: "var(--radius-xs)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: `color-mix(in srgb, ${spendVsPrev > 0 ? THEME.rust : THEME.sage} 10%, transparent)`,
                                  color: spendVsPrev > 0 ? THEME.rust : THEME.sage,
                                }}
                              >
                                {spendVsPrev > 0 ? "▲" : "▼"} {Math.abs(spendVsPrev)}% vs{" "}
                                {prevMonthLabel}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {!isCurrentMonth && (
                          <button
                            onClick={() => {
                              const now = new Date();
                              setSpendingViewMonth(
                                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
                              );
                              setSelectedExpenseCategory(null);
                              setActiveExpenseIndex(null);
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              height: 30,
                              padding: "0 12px",
                              borderRadius: 8,
                              border: `1.5px solid ${THEME.accent}`,
                              background: `color-mix(in srgb, var(--t-accent) 8%, transparent)`,
                              cursor: "pointer",
                              color: THEME.accent,
                              transition: "all 0.15s",
                            }}
                          >
                            Today
                          </button>
                        )}
                        <button
                          onClick={() => navToMonth(1)}
                          disabled={isCurrentMonth}
                          aria-label="Next month"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border: `1.5px solid ${THEME.line}`,
                            background: "transparent",
                            cursor: isCurrentMonth ? "default" : "pointer",
                            color: isCurrentMonth ? THEME.muted : THEME.ink,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: isCurrentMonth ? 0.35 : 1,
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrentMonth) {
                              (e.currentTarget as HTMLButtonElement).style.borderColor =
                                THEME.accent;
                              (e.currentTarget as HTMLButtonElement).style.background =
                                `color-mix(in srgb, var(--t-accent) 8%, transparent)`;
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.line;
                            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                          }}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Mini spend comparison bar */}
                    {spendingData.total > 0 && prevMonthTotal > 0 && (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: THEME.muted,
                            marginBottom: 6,
                          }}
                        >
                          <span>This month</span>
                          <span>{prevMonthLabel}</span>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 6,
                          }}
                        >
                          {[
                            {
                              val: spendingData.total,
                              color:
                                spendVsPrev !== null && spendVsPrev > 0 ? THEME.rust : THEME.sage,
                              label: spendMonthLabel,
                            },
                            { val: prevMonthTotal, color: THEME.muted, label: prevMonthLabel },
                          ].map(({ val, color }) => (
                            <div key={val}>
                              <div
                                style={{
                                  height: 6,
                                  background: THEME.line,
                                  borderRadius: 4,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${(val / maxBarVal) * 100}%`,
                                    background: color,
                                    borderRadius: 4,
                                    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
                  gap: 24,
                }}
              >
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
                  {!spendingData.breakdown?.length ? (
                    <div
                      style={{
                        height: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: THEME.muted,
                        fontSize: 13,
                        background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                        <div style={{ width: "100%", height: 260, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                        </ResponsiveContainer></div>

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
                            <Money
                              value={
                                activeExpenseIndex !== null
                                  ? spendingData.breakdown[activeExpenseIndex]?.value
                                  : selectedExpenseCategory
                                    ? spendingData.breakdown.find(
                                        (x: any) => x.name === selectedExpenseCategory
                                      )?.value || 0
                                    : spendingData.total
                              }
                              variant="full"
                            />
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
                                    background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                                    <Money value={item.value} variant="full" />
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
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Drill down into ${item.name}`}
                                  onMouseEnter={() => setActiveExpenseIndex(i)}
                                  onMouseLeave={() => setActiveExpenseIndex(null)}
                                  onClick={() => setSelectedExpenseCategory(item.name)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedExpenseCategory(item.name);
                                    }
                                  }}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: isHovered
                                      ? `color-mix(in srgb, ${THEME.ink} 5%, transparent)`
                                      : `color-mix(in srgb, ${THEME.ink} 2%, transparent)`,
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
                                    <Money value={item.value} variant="full" />
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
                  {!spendingData.breakdown?.length ? (
                    <div
                      style={{
                        height: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: THEME.muted,
                        fontSize: 13,
                        background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                                <Money value={cat.value} variant="full" />
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
                            background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
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
                                <Money value={cat.value} variant="full" />
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
                                {prevMonthLabel}: {prevVal > 0 ? <Money value={prevVal} variant="full" /> : "—"}
                              </span>
                              {isNew ? (
                                <span style={{ color: THEME.gold, fontWeight: 700 }}>
                                  New this month
                                </span>
                              ) : delta !== 0 ? (
                                <span
                                  style={{ color: isUp ? THEME.rust : THEME.sage, fontWeight: 700 }}
                                >
                                  {isUp ? "▲" : "▼"} <Money value={Math.abs(delta)} variant="full" />
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
          {/* Hero Header */}
          <div className="sub-tab-hero animate-fade-in">
            <span className="sub-tab-hero-icon">
              <Calendar size={28} />
            </span>
            <div className="sub-tab-hero-body">
              <div className="sub-tab-hero-title">Financial Calendar</div>
              <div className="sub-tab-hero-desc">
                Upcoming EMIs, insurance renewals, SIP dates and scheduled financial commitments
              </div>
            </div>
            <div className="sub-tab-hero-badge">
              <Bell size={12} /> Upcoming dues
            </div>
          </div>
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
                  aria-label="Previous month"
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
                  aria-label="Next month"
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

              const dueDays = calendarDueDays;
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
                          {...(hasEvents
                            ? {
                                role: "button",
                                tabIndex: 0,
                                "aria-label": `${d} ${calendarDate.toLocaleString("en-IN", { month: "long" })}: ${dueDays[d].length} event${dueDays[d].length !== 1 ? "s" : ""} — ${dueDays[d].map((e: any) => e.label).join(", ")}`,
                              }
                            : {})}
                          onClick={() => {
                            if (d && hasEvents) {
                              setSelectedDayEvents({ day: d, events: dueDays[d] });
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && d && hasEvents) {
                              e.preventDefault();
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
                                ? `color-mix(in srgb, var(--t-accent) 15%, transparent)`
                                : d && dueDays[d]
                                  ? `color-mix(in srgb, var(--t-gold) 6%, transparent)`
                                  : "transparent",
                            border:
                              d && d === today2
                                ? `1.5px solid ${THEME.accent}`
                                : d && dueDays[d]
                                  ? `1px dashed color-mix(in srgb, var(--t-gold) 30%, transparent)`
                                  : `1px solid ${THEME.line}`,
                            cursor: hasEvents ? "pointer" : "default",
                            transition: "all 0.18s ease-in-out",
                          }}
                          className={hasEvents ? "card-lift" : ""}
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
                      <span style={{ color: THEME.violet, fontWeight: 700 }}>●</span> Advance tax
                    </span>
                    <span>
                      <span style={{ color: THEME.sage, fontWeight: 700 }}>●</span> Insurance / FD
                      maturity / Paid Rent
                    </span>
                    <span>
                      <span style={{ color: THEME.accent, fontWeight: 700 }}>●</span> SIP deductions
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
          <Card
            style={{
              padding: 0,
              overflow: "hidden",
              borderRadius: 20,
              background: isDark ? "var(--surface-2)" : "#0F172A",
              border: isDark ? `1px solid ${THEME.line}` : "none",
            }}
          >
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
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 26,
                          fontWeight: 600,
                          color: "#fff",
                        }}
                      >
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
                        : "Max level reached!"}
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
                      fontFamily: "var(--font-display)",
                      fontSize: 56,
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: "-0.01em",
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
                    <dashboardData.streakEmoji size={28} color="#fff" />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 600, lineHeight: 1, color: "#fff" }}>
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
                  icon: Medal,
                },
                {
                  label: "Categories",
                  value: `${Object.values(habitsBadges.cats).filter((c: any) => c.earnedCount === c.total).length}/${Object.keys(habitsBadges.cats).length}`,
                  icon: CheckCircle2,
                },
                { label: "Month Streak", value: `${dashboardData.streak}mo`, icon: Flame },
                { label: "XP Points", value: habitsBadges.totalXP.toLocaleString(), icon: Zap },
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
                  <div
                    style={{
                      marginBottom: 4,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <s.icon size={20} color={THEME.ink} />
                  </div>
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
                  [THEME.sage, "Saved"],
                  [THEME.rust, "Deficit"],
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
                      : m.isCurrentMonth
                        ? `${m.label} ${m.year}: In progress — counted once the month closes`
                        : `${m.label} ${m.year}: No data`
                  }
                  style={{
                    borderRadius: 10,
                    overflow: "hidden",
                    border: `1.5px solid ${m.hasData ? (m.saved ? `color-mix(in srgb, ${THEME.sage} 20%, transparent)` : `color-mix(in srgb, ${THEME.rust} 20%, transparent)`) : THEME.line}`,
                    background: m.hasData
                      ? m.saved
                        ? `color-mix(in srgb, ${THEME.sage} 5%, transparent)`
                        : `color-mix(in srgb, ${THEME.rust} 5%, transparent)`
                      : "var(--surface-0)",
                  }}
                >
                  <div
                    style={{
                      height: 5,
                      background: m.hasData ? (m.saved ? THEME.sage : THEME.rust) : THEME.line,
                    }}
                  />
                  <div style={{ padding: "9px 8px" }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: m.hasData ? (m.saved ? THEME.sage : THEME.rust) : THEME.muted,
                      }}
                    >
                      {m.label}
                    </div>
                    <div style={{ fontSize: 9, color: THEME.muted, marginTop: 1 }}>
                      {m.hasData ? (m.saved ? `${m.rate}%` : "deficit") : m.isCurrentMonth ? "in progress" : "—"}
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
                gridTemplateColumns: "repeat(auto-fill, minmax(var(--grid-min-sm), 1fr))",
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
                        ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                        : inProg
                          ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)`
                          : "var(--surface-0)",
                      border: `1px solid ${complete ? `color-mix(in srgb, ${THEME.sage} 25%, transparent)` : inProg ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)` : THEME.line}`,
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
                          color: complete ? THEME.sage : THEME.ink,
                          lineHeight: 1.2,
                        }}
                      >
                        {cat}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: complete ? THEME.sage : inProg ? THEME.gold : THEME.muted,
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
                          background: complete ? THEME.sage : inProg ? THEME.gold : THEME.line,
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
                <Zap size={15} color={THEME.gold} style={{ flexShrink: 0 }} />
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
                      background:
                        i === 0
                          ? `color-mix(in srgb, ${THEME.accent} 5%, transparent)`
                          : "var(--surface-0)",
                      border: `1px solid ${i === 0 ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)` : THEME.line}`,
                      borderLeft: `3px solid ${i === 0 ? THEME.accent : i === 1 ? THEME.gold : THEME.line}`,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <tip.icon
                      size={20}
                      color={THEME.accent}
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
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
                              color: THEME.accent,
                              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                              padding: "2px 7px",
                              borderRadius: 99,
                              border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
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
                            <span style={{ fontSize: 9, color: THEME.accent, fontWeight: 800 }}>
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
                                background: THEME.accent,
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
                          ? THEME.sage
                          : catData.earnedCount > 0
                            ? THEME.gold
                            : THEME.muted,
                        background: allEarned
                          ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                          : catData.earnedCount > 0
                            ? `color-mix(in srgb, ${THEME.gold} 8%, transparent)`
                            : "var(--surface-0)",
                        border: `1px solid ${allEarned ? `color-mix(in srgb, ${THEME.sage} 25%, transparent)` : catData.earnedCount > 0 ? `color-mix(in srgb, ${THEME.gold} 20%, transparent)` : THEME.line}`,
                      }}
                    >
                      {catData.earnedCount}/{catData.total}
                    </div>
                  </div>
                  {allEarned ? (
                    <span
                      style={{
                        fontSize: 10,
                        color: THEME.sage,
                        fontWeight: 800,
                        background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                        padding: "2px 10px",
                        borderRadius: 99,
                        border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
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
                        ? THEME.sage
                        : catData.earnedCount > 0
                          ? THEME.gold
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
                            ? `linear-gradient(145deg, color-mix(in srgb, ${THEME.sage} 10%, transparent), var(--t-paper))`
                            : isActive
                              ? `linear-gradient(145deg, color-mix(in srgb, ${THEME.accent} 5%, transparent), var(--t-paper))`
                              : "var(--surface-0)",
                          border: isEarned
                            ? `1.5px solid color-mix(in srgb, ${THEME.sage} 33%, transparent)`
                            : isActive
                              ? `1.5px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`
                              : `1px solid ${THEME.line}`,
                          opacity: b.status === "locked" ? 0.4 : 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 7,
                          position: "relative",
                          boxShadow: "var(--shadow-sm)",
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
                            color: isEarned ? THEME.sage : THEME.muted,
                            background: isEarned
                              ? `color-mix(in srgb, ${THEME.sage} 10%, transparent)`
                              : "var(--surface-0)",
                            border: `1px solid ${isEarned ? `color-mix(in srgb, ${THEME.sage} 25%, transparent)` : THEME.line}`,
                            padding: "1px 5px",
                            borderRadius: 6,
                          }}
                        >
                          +{xp} XP
                        </div>

                        <div
                          style={{
                            lineHeight: 1,
                            filter: b.status === "locked" ? "grayscale(1) opacity(0.4)" : "none",
                            color: isEarned ? THEME.sage : isActive ? THEME.accent : THEME.muted,
                          }}
                        >
                          <b.icon size={26} />
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: isEarned ? THEME.sage : isActive ? THEME.ink : THEME.muted,
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
                              color: THEME.sage,
                              background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                              padding: "3px 8px",
                              borderRadius: 99,
                              alignSelf: "flex-start",
                              border: `1px solid color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
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
                              <span style={{ fontSize: 9, color: THEME.accent, fontWeight: 900 }}>
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
                                  background: `linear-gradient(90deg, ${THEME.accent}, color-mix(in srgb, ${THEME.accent} 70%, #fff))`,
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
                              color: THEME.accent,
                              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                              padding: "3px 8px",
                              borderRadius: 99,
                              alignSelf: "flex-start",
                              border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                            }}
                          >
                            Next up →
                          </div>
                        )}
                        {b.status === "locked" && (
                          <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 600 }}>
                            Locked
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
                      background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                      borderLeft: `3px solid ${THEME.sage}`,
                      borderRadius: 12,
                      fontSize: 11,
                      color: THEME.sage,
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    {unlock}
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
                        color:
                          row.pct === 100 ? THEME.sage : row.pct > 0 ? THEME.accent : THEME.muted,
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
                            ? `linear-gradient(90deg, ${THEME.sage}, color-mix(in srgb, ${THEME.sage} 65%, white))`
                            : row.pct > 50
                              ? `linear-gradient(90deg, ${THEME.accent}, color-mix(in srgb, var(--t-accent) 65%, white))`
                              : row.pct > 0
                                ? `linear-gradient(90deg, ${THEME.gold}, color-mix(in srgb, ${THEME.gold} 65%, white))`
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
              <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                    cursor={{ fill: THEME.line, opacity: 0.4 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${THEME.line}`,
                      background: "var(--t-paper)",
                      boxShadow: "var(--shadow-md)",
                      fontSize: 12,
                      color: THEME.ink,
                    }}
                    labelStyle={{ color: THEME.muted }}
                    itemStyle={{ color: THEME.ink }}
                    formatter={(v: any, name: string) => [
                      typeof v === "number" ? v.toFixed(1) : v,
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 20, color: THEME.ink }}
                    iconType="circle"
                  />
                  <Bar dataKey="You" fill="var(--t-accent)" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Average" fill={THEME.muted} radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Top10" fill={THEME.sage} radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer></div>
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
          marketData={marketData}
          selectedDate={calendarDate}
          activeProfile={activeProfile}
          onClose={() => setShowReport(false)}
        />
      )}

      {nomineeModal && (
        <Modal title="Assign Nominee" onClose={() => setNomineeModal(null)} maxWidth={420}>
          <div style={{ marginBottom: 16 }}>
            <Badge variant="muted" style={{ fontSize: 10, marginBottom: 6 }}>
              {nomineeModal.type}
            </Badge>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
              <Prv>{nomineeModal.name}</Prv>
            </div>
          </div>

          <Field label="Nominee Name">
            <Input
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              placeholder="Enter nominee name"
              autoFocus
            />
          </Field>

          <Field label="Relation">
            <Select value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)}>
              {NOMINEE_RELATION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>

          <ModalActions
            onSave={handleAssignNominee}
            onClose={() => setNomineeModal(null)}
            saveLabel={nomineeSaving ? "Saving…" : "Assign Nominee"}
            disabled={!nomineeName.trim() || nomineeSaving}
          />
        </Modal>
      )}

      {selectedDayEvents && (
        <Modal
          title={`Scheduled Items — ${getOrdinal(selectedDayEvents.day)} ${calendarDate.toLocaleString("en-IN", { month: "long" })} ${calendarDate.getFullYear()}`}
          onClose={() => setSelectedDayEvents(null)}
          maxWidth={420}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
            {selectedDayEvents.events.map((evt, idx) => {
              const isPaid = evt.paid === true;
              return (
                <div
                  key={idx}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: `color-mix(in srgb, ${THEME.ink} 3%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${evt.color} 18%, transparent)`,
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
                      {evt.frequency ? `${evt.frequency} · ` : ""}
                      {evt.amount > 0 ? (
                        <>
                          {evt.amountLabel || "Amount"}: <Money value={evt.amount} variant="full" />
                        </>
                      ) : (
                        "Scheduled"
                      )}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <Badge
                      style={{
                        background: isPaid
                          ? `color-mix(in srgb, var(--t-sage) 12%, transparent)`
                          : `color-mix(in srgb, var(--t-gold) 12%, transparent)`,
                        color: isPaid ? THEME.sage : THEME.gold,
                        border: `1px solid color-mix(in srgb, ${isPaid ? THEME.sage : THEME.gold} 35%, transparent)`,
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      {isPaid ? "Paid" : "Due"}
                    </Badge>
                    {setTab &&
                      !isPaid &&
                      (() => {
                        // Keyed off the event's own `type` (set once in calendarDueDays)
                        // rather than sniffing keywords out of the display label — a
                        // user-entered name like a property called "Card House" used
                        // to be able to hijack the label-matching routing.
                        const targetTab = EVENT_TYPE_TO_TARGET_TAB[evt.type as string] || null;
                        if (!targetTab) return null;
                        return (
                          <button
                            onClick={() => {
                              setTab(targetTab);
                              setSelectedDayEvents(null);
                            }}
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: THEME.accent,
                              background: "var(--surface-0)",
                              border: `1px solid color-mix(in srgb, var(--t-accent) 27%, transparent)`,
                              padding: "4px 10px",
                              borderRadius: 6,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            Pay →
                          </button>
                        );
                      })()}
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

const HeroStat = ({
  label,
  value,
  negative,
  sage,
  tabId,
  subTabId,
  setTab,
  setSubTab,
}: any) => {
  const color = negative ? "#F87171" : sage ? "#34D399" : "rgba(255,255,255,0.9)";
  // Border uses explicit rgba so appending digits to color string is avoided
  const borderColor = negative
    ? "rgba(248,113,113,0.18)"
    : sage
      ? "rgba(52,211,153,0.18)"
      : "rgba(255,255,255,0.09)";
  const isClickable = !!(tabId && setTab);
  const handleActivate = isClickable
    ? () => {
        setTab(tabId);
        if (subTabId && setSubTab) setSubTab(subTabId);
      }
    : undefined;
  return (
    <div
      onClick={handleActivate}
      title={isClickable ? `View in ${label}` : undefined}
      {...(isClickable
        ? {
            role: "button",
            tabIndex: 0,
            "aria-label": `View in ${label}`,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleActivate!();
              }
            },
          }
        : {})}
      style={{
        borderLeft: `2px solid ${borderColor}`,
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
        <Money value={value} variant="full" />
      </div>
    </div>
  );
};
