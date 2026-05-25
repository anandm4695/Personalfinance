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
import { fmtINR, fmtINRFull, getCCDueDate } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { MonthlyReportModal } from "../modals/MonthlyReportModal";
import { Modal } from "../ui/Modal";
import { SectionTitle } from "../ui/SectionTitle";
import { StockLogo } from "./DematTab";

interface AnalyticsTabProps {
  metrics: any;
  state: any;
  assetBreakdown: any[];
  trendData: any[];
  setState: any;
  marketData?: any;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  metrics,
  state,
  assetBreakdown,
  trendData,
  setState,
  marketData,
}) => {
  const [sub, setSub] = useState("dashboard");
  const [showReport, setShowReport] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ day: number; events: any[] } | null>(null);
  const [rebalTargets, setRebalTargets] = useState({ equity: 60, debt: 25, cash: 10, other: 5 });

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

  // Interactive dashboard states
  const [trendPeriod, setTrendPeriod] = useState<"3M" | "6M" | "12M" | "All">("6M");
  const [showAllTxns, setShowAllTxns] = useState(false);
  const [fireWhatIfExtra, setFireWhatIfExtra] = useState(0);

  const lastTradingDayPerformance = useMemo(() => {
    const uniqueStocks = new Map<string, { base: string; exchange: string; yfSym: string }>();
    (state.stocks || []).forEach((s: any) => {
      const base = s.symbol.replace(/\.(NS|BO)$/i, "");
      const exch = s.exchange || "NSE";
      const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
      if (!uniqueStocks.has(yfSym)) {
        uniqueStocks.set(yfSym, { base, exchange: exch, yfSym });
      }
    });

    let gainingCount = 0;
    let losingCount = 0;
    let noChangeCount = 0;

    let topGainer: any = null;
    let topLoser: any = null;

    uniqueStocks.forEach(({ base, yfSym }) => {
      const md = marketData?.[yfSym];
      if (!md) {
        noChangeCount++;
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
        changePct
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
      }
    });

    return {
      gainingCount,
      losingCount,
      noChangeCount,
      topGainer,
      topLoser
    };
  }, [state.stocks, marketData]);

  const getStockCapAssets = (capName: string) => {
    return (state.stocks || []).map((s: any) => {
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
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    return (state.transactions || [])
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.date &&
          t.date.startsWith(ym) &&
          (t.category || "Uncategorized") === catName
      )
      .map((t: any) => ({
        name: t.description || "Expense",
        sub: t.date,
        value: Number(t.amount || 0),
      }))
      .sort((a: any, b: any) => b.value - a.value);
  };


  const getSubAssets = (categoryName: string) => {
    switch (categoryName) {
      case "Bank Cash":
        return (state.bankAccounts || []).map((a: any) => ({
          name: a.bankName || "Unknown Bank",
          sub: a.accountType || "Savings",
          value: Number(a.balance || 0),
        })).sort((a: any, b: any) => b.value - a.value);

      case "Fixed Deposits":
        return (state.fixedDeposits || []).map((f: any) => ({
          name: f.bank || "FD",
          sub: `${f.rate || 0}% · Due: ${f.maturityDate || "N/A"}`,
          value: Number(f.principal || 0),
        })).sort((a: any, b: any) => b.value - a.value);

      case "Recurring Deposits":
        return (state.recurringDeposits || []).map((r: any) => {
          const start = r.startDate ? new Date(r.startDate) : new Date();
          const now = new Date();
          const m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
          const months = Math.max(0, Math.min(m, Number(r.tenureMonths || 0)));
          const currentVal = months * Number(r.monthly || 0);
          return {
            name: r.bank || "RD",
            sub: `${fmtINR(r.monthly || 0)}/mo · ${months}/${r.tenureMonths || 0} m`,
            value: currentVal,
          };
        }).sort((a: any, b: any) => b.value - a.value);

      case "Mutual Funds":
        return (state.mutualFunds || []).map((m: any) => ({
          name: m.name || "Mutual Fund",
          sub: `${Number(m.units || 0).toFixed(3)} units @ Nav ₹${Number(m.currentNav || 0).toFixed(2)}`,
          value: Number(m.units || 0) * Number(m.currentNav || 0),
        })).sort((a: any, b: any) => b.value - a.value);

      case "Stocks":
        return (state.stocks || []).map((s: any) => {
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
        }).reduce((acc: any[], current: any) => {
          const existing = acc.find(item => item.name === current.name);
          if (existing) {
            existing.value += current.value;
          } else {
            acc.push(current);
          }
          return acc;
        }, []).sort((a: any, b: any) => b.value - a.value);

      case "PPF":
        return (state.ppf || []).map((p: any) => ({
          name: p.bank || "PPF",
          sub: p.accountNumber ? `Ac: ${p.accountNumber}` : "PPF Balance",
          value: Number(p.balance || 0),
        })).sort((a: any, b: any) => b.value - a.value);

      case "NPS":
        return (state.nps || []).map((n: any) => ({
          name: n.bank || "NPS",
          sub: n.accountNumber ? `PRAN: ${n.accountNumber}` : "NPS Balance",
          value: Number(n.balance || 0),
        })).sort((a: any, b: any) => b.value - a.value);

      case "EPF":
        return (state.epf || []).map((e: any) => ({
          name: e.employer || "EPF",
          sub: e.uan ? `UAN: ${e.uan}` : "EPF Balance",
          value: Number(e.balance || 0),
        })).sort((a: any, b: any) => b.value - a.value);

      case "Bonds":
        return (state.bonds || []).map((b: any) => ({
          name: b.name || "Bond",
          sub: `${b.coupon || 0}% Coupon`,
          value: Number(b.faceValue || 0),
        })).sort((a: any, b: any) => b.value - a.value);

      case "LIC":
        return (state.lic || []).map((l: any) => {
          const txTotal = (l.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
          const premium = txTotal > 0 ? txTotal : Number(l.premiumPaid || 0);
          return {
            name: l.name || "LIC Policy",
            sub: l.policyNumber ? `No: ${l.policyNumber}` : "Life Insurance",
            value: premium,
          };
        }).sort((a: any, b: any) => b.value - a.value);

      case "Investment Plans":
        return (state.investmentPlans || []).map((ip: any) => {
          const txTotal = (ip.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
          const premium = txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0);
          return {
            name: ip.name || "ULIP",
            sub: ip.policyNumber ? `No: ${ip.policyNumber}` : "ULIP Investment",
            value: premium,
          };
        }).sort((a: any, b: any) => b.value - a.value);

      case "Loans Given":
        return (state.loansGiven || []).map((l: any) => ({
          name: l.lender || "Borrower",
          sub: l.rate ? `${l.rate}% Interest` : "Interest Free",
          value: Number(l.outstanding || 0),
        })).sort((a: any, b: any) => b.value - a.value);

      default:
        return [];
    }
  };

  const topHoldings = useMemo(() => {
    const map: Record<string, { base: string; exchange: string; yfSym: string; totalValue: number; qty: number }> = {};
    
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
      .map(item => ({
        ...item,
        percentage: totalPortfolioValue > 0 ? (item.totalValue / totalPortfolioValue) * 100 : 0
      }));
  }, [state.stocks, marketData]);

  const subs = [
    { id: "dashboard", label: "Dashboard", icon: PieIcon },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "allocation", label: "Allocation", icon: Target },
    { id: "planning", label: "Planning", icon: Activity },
    { id: "spending", label: "Spending", icon: CreditCard },
    { id: "calendar", label: "Calendar", icon: Calendar },
  ];

  const netWorthTrend = useMemo(() => {
    const histMap: Record<string, number> = {};
    (state.netWorthHistory || []).forEach((h: any) => { histMap[h.month] = h.netWorth; });
    const now = new Date();
    return trendData.map((t, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (trendData.length - 1 - i), 1);
      const ym = d.toISOString().slice(0, 7);
      const value = histMap[ym] !== undefined
        ? histMap[ym]
        : metrics.netWorth; 
      return { month: t.month, value, real: histMap[ym] !== undefined };
    });
  }, [trendData, metrics, state.netWorthHistory]);

  const filteredNetWorthTrend = useMemo(() => {
    if (trendPeriod === "All") return netWorthTrend;
    const n = trendPeriod === "3M" ? 3 : trendPeriod === "6M" ? 6 : 12;
    return netWorthTrend.slice(-n);
  }, [netWorthTrend, trendPeriod]);

  const dashboardData = useMemo(() => {
    let savingsScore = 0, debtScore = 0, emergencyScore = 0, divScore = 0;
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

    const emergencyMonths = metrics.monthExpense > 0 ? metrics.cashInBanks / metrics.monthExpense : 0;
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
    const scoreColor = !hasData ? THEME.muted : totalScore >= 75 ? THEME.sage : totalScore >= 50 ? THEME.gold : THEME.rust;

    const investTypes = [
      state.mutualFunds.length > 0 ? "MF" : null,
      state.stocks.length > 0 ? "Stocks" : null,
      state.fixedDeposits.length > 0 ? "FDs" : null,
      (state.ppf.length > 0 || state.nps.length > 0) ? "PPF/NPS" : null,
    ].filter(Boolean);

    const subScores = [
      {
        label: "Savings Rate", score: savingsScore, max: 25, pct: (savingsScore / 25) * 100,
        color: savingsScore >= 25 ? THEME.sage : savingsScore >= 18 ? THEME.gold : savingsScore >= 10 ? "#F97316" : THEME.rust,
        hint: metrics.monthIncome > 0 ? `${metrics.savingsRate.toFixed(0)}% of income saved` : "No income data",
      },
      {
        label: "Debt Health", score: debtScore, max: 25, pct: (debtScore / 25) * 100,
        color: debtScore >= 25 ? THEME.sage : debtScore >= 18 ? THEME.gold : debtScore >= 10 ? "#F97316" : THEME.rust,
        hint: metrics.totalAssets === 0 ? "No asset data" : metrics.totalLiabilities === 0 ? "Debt-free" : `${metrics.debtToAssetRatio.toFixed(0)}% debt-to-asset ratio`,
      },
      {
        label: "Emergency Fund", score: emergencyScore, max: 25, pct: (emergencyScore / 25) * 100,
        color: emergencyScore >= 25 ? THEME.sage : emergencyScore >= 18 ? THEME.gold : emergencyScore >= 10 ? "#F97316" : THEME.rust,
        hint: metrics.monthExpense > 0 ? `${emergencyMonths.toFixed(1)} months of expenses covered` : "No expense data",
      },
      {
        label: "Diversification", score: divScore, max: 25, pct: (divScore / 25) * 100,
        color: divScore >= 25 ? THEME.sage : divScore >= 18 ? THEME.gold : divScore >= 10 ? "#F97316" : THEME.rust,
        hint: investTypes.length > 0 ? (investTypes as string[]).join(", ") : "No investments yet",
      },
    ];

    const todayMs = new Date().getTime();
    const plus30Ms = todayMs + 30 * 86400000;
    const dues: any[] = [];
    state.creditCards.filter((c: any) => (c.status || "").toLowerCase() !== "closed").forEach((c: any) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) {
        const ms = new Date(dueDate).getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms) dues.push({ name: (c.issuer || "Card") + " Bill", amount: Number(c.outstanding || 0), daysLeft, date: dueDate });
      }
    });
    state.subscriptions.forEach((s: any) => {
      if (s.renewalDate) {
        const ms = new Date(s.renewalDate).getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms) dues.push({ name: s.name + " Renewal", amount: Number(s.amount || 0), daysLeft, date: s.renewalDate });
      }
    });
    // Rent dues for active rented property agreements (1-31 recurring monthly, defaults to 5th)
    (state.rentedProperties || []).filter((p: any) => p.isActive !== false && Number(p.monthlyRent) > 0).forEach((p: any) => {
      const dueDay = p.dueDay ? parseInt(p.dueDay, 10) : 5;
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth(); // 0-indexed
      
      const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const paidCurrent = (p.payments || []).some((pay: any) => pay.date && pay.date.startsWith(currentMonthStr));
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
        const paidNext = (p.payments || []).some((pay: any) => pay.date && pay.date.startsWith(nextMonthStr));
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
    (state.fixedDeposits || []).filter((f: any) => f.maturityDate).forEach((f: any) => {
      const ms = new Date(f.maturityDate).getTime();
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
    const expensePct = metrics.monthIncome > 0 ? (metrics.monthExpense / metrics.monthIncome) * 100 : 0;
    const savedPct = metrics.monthIncome > 0 ? Math.max(0, (saved / metrics.monthIncome) * 100) : 0;

    let streak = 0;
    const now = new Date();
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Use local date parts — toISOString() would return UTC which shifts month for IST (UTC+5:30)
      const ym2 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const txns = state.transactions.filter((t: any) => t.date && t.date.startsWith(ym2));
      const inc = txns.filter((t: any) => t.type === "credit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const exp = txns.filter((t: any) => t.type === "debit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      if (inc > exp && inc > 0) streak++; else break;
    }
    const streakEmoji = streak >= 12 ? "🏆" : streak >= 6 ? "🔥" : streak >= 3 ? "⚡" : streak >= 1 ? "✅" : "💤";
    const streakMsg = streak >= 12 ? "Incredible!" : streak >= 6 ? "On fire!" : streak >= 3 ? "Great run!" : streak >= 1 ? "Keep going!" : "Start saving";

    return { totalScore, scoreColor, subScores, dues, saved, expensePct, savedPct, streak, streakEmoji, streakMsg, hasData };
  }, [metrics, state.mutualFunds.length, state.stocks.length, state.fixedDeposits.length, state.ppf.length, state.nps.length, state.creditCards, state.subscriptions, state.transactions, state.rentedProperties]);

  const momNetWorthDelta = useMemo(() => {
    if (!state.netWorthHistory || state.netWorthHistory.length < 2) return null;
    const sorted = [...state.netWorthHistory].sort((a: any, b: any) => a.month.localeCompare(b.month));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const latestVal = latest.netWorth ?? latest.net_worth ?? 0;
    const prevVal = prev.netWorth ?? prev.net_worth ?? 0;
    const delta = latestVal - prevVal;
    const pct = prevVal !== 0 ? (delta / Math.abs(prevVal)) * 100 : 0;
    return { delta, pct };
  }, [state.netWorthHistory]);

  const fireData = useMemo(() => {
    const annualExpense = metrics.monthExpense * 12;
    const fireCorpus = annualExpense * 25;
    const progress = fireCorpus > 0 ? Math.min((Math.max(metrics.netWorth, 0) / fireCorpus) * 100, 100) : 0;
    return { fireCorpus, progress, annualExpense };
  }, [metrics.monthExpense, metrics.netWorth]);

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
    
    const totalTermCover = (state.termPlans || []).reduce((s: number, t: any) => s + Number(t.coverAmount || 0), 0);
    const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
    const emergencyMonths = metrics.monthExpense > 0 ? metrics.cashInBanks / metrics.monthExpense : 0;

    if (metrics.monthIncome > 0 && metrics.savingsRate < 10)
      insights.push({ icon: AlertTriangle, title: "Low Savings Rate", value: `${metrics.savingsRate.toFixed(0)}% · target 20%+`, color: THEME.rust, bg: "rgba(239,68,68,0.07)" });
    else if (metrics.savingsRate >= 30)
      insights.push({ icon: Flame, title: "Strong Savings Rate", value: `${metrics.savingsRate.toFixed(0)}% this month`, color: THEME.sage, bg: "rgba(52,211,153,0.07)" });

    if (metrics.monthExpense > 0 && emergencyMonths < 3)
      insights.push({ icon: ShieldAlert, title: "Emergency Fund", value: `${emergencyMonths.toFixed(1)} mo liquid · need 3+`, color: THEME.rust, bg: "rgba(239,68,68,0.07)" });
    else if (emergencyMonths >= 6)
      insights.push({ icon: ShieldAlert, title: "Emergency Fund", value: `${emergencyMonths.toFixed(1)} mo — solid cover`, color: THEME.sage, bg: "rgba(52,211,153,0.07)" });

    if (annualIncome > 0 && coverRatio < 10)
      insights.push({ icon: AlertTriangle, title: "Insurance Gap", value: `${fmtINR(annualIncome * 15 - totalTermCover)} short of 15× cover`, color: THEME.gold, bg: "rgba(251,191,36,0.07)" });

    if (metrics.debtToAssetRatio > 40)
      insights.push({ icon: AlertTriangle, title: "High Debt Ratio", value: `${metrics.debtToAssetRatio.toFixed(0)}% of total assets`, color: THEME.rust, bg: "rgba(239,68,68,0.07)" });

    const urgentDues = dashboardData.dues.filter((d: any) => d.daysLeft <= 7);
    if (urgentDues.length > 0)
      insights.push({ icon: AlertTriangle, title: `${urgentDues.length} Due This Week`, value: urgentDues.slice(0, 2).map((d: any) => d.name).join(", "), color: THEME.gold, bg: "rgba(251,191,36,0.07)" });

    if ((state.sips || []).length === 0 && metrics.monthIncome > 0)
      insights.push({ icon: Zap, title: "No Active SIPs", value: "Consider starting a monthly mutual fund SIP", color: "#6366f1", bg: "rgba(99,102,241,0.07)" });

    // FOIR: Fixed Obligation to Income Ratio — healthy lending threshold is <40%
    const totalEMISmart = (state.loansTaken || []).reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    if (metrics.monthIncome > 0 && totalEMISmart > 0) {
      const foirPct = (totalEMISmart / metrics.monthIncome) * 100;
      if (foirPct > 50) insights.push({ icon: AlertTriangle, title: "EMI Burden Critical", value: `${foirPct.toFixed(0)}% FOIR — reduce debt urgently`, color: THEME.rust, bg: "rgba(239,68,68,0.07)" });
      else if (foirPct > 40) insights.push({ icon: AlertTriangle, title: "High EMI Burden", value: `${foirPct.toFixed(0)}% FOIR · keep under 40%`, color: THEME.gold, bg: "rgba(251,191,36,0.07)" });
    }

    // Credit card utilization — above 30% can hurt credit score
    const totalCCLimitSmart = (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((s: number, c: any) => s + Number(c.limit || c.cardLimit || 0), 0);
    if (totalCCLimitSmart > 0 && metrics.ccOutstanding > 0) {
      const utilPct = (metrics.ccOutstanding / totalCCLimitSmart) * 100;
      if (utilPct > 50) insights.push({ icon: AlertTriangle, title: "High Credit Utilization", value: `${utilPct.toFixed(0)}% used · aim for below 30%`, color: THEME.rust, bg: "rgba(239,68,68,0.07)" });
    }

    if (insights.length === 0 && metrics.netWorth > 0)
      insights.push({ icon: Flame, title: "All Clear", value: "Your finances are on a healthy track", color: THEME.sage, bg: "rgba(52,211,153,0.07)" });

    return insights;
  }, [metrics, state.income, state.transactions, state.termPlans, state.sips, dashboardData]);

  const ytdData = useMemo(() => {
    const now = new Date();
    const yearStr = `${now.getFullYear()}`;
    const ytdTxns = (state.transactions || []).filter((t: any) => t.date && t.date.startsWith(yearStr));
    const ytdTxnIncome = ytdTxns.filter((t: any) => t.type === "credit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    // Income ledger is the authoritative source (mirrors App.tsx explicitIncome priority)
    const ytdIncomeLedger = (state.income || [])
      .filter((i: any) => i.date && i.date.startsWith(yearStr))
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const ytdIncome = ytdIncomeLedger > 0 ? ytdIncomeLedger : ytdTxnIncome;
    const ytdTxnExpense = ytdTxns.filter((t: any) => t.type === "debit").reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    // Rent payments tracked via rentedProperties.payments are not debit transactions
    const ytdRentPaid = (state.rentedProperties || []).reduce((sum: number, p: any) =>
      sum + (p.payments || [])
        .filter((pay: any) => pay.date && pay.date.startsWith(yearStr))
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0), 0);
    const ytdExpense = ytdTxnExpense + ytdRentPaid;
    const ytdSavings = ytdIncome - ytdExpense;
    const ytdSavingsRate = ytdIncome > 0 ? (ytdSavings / ytdIncome) * 100 : 0;
    const monthsElapsed = now.getMonth() + 1;
    const monthName = now.toLocaleString("en-IN", { month: "short" });
    return { ytdIncome, ytdExpense, ytdSavings, ytdSavingsRate, monthsElapsed, monthName };
  }, [state.transactions, state.income, state.rentedProperties]);

  const passiveIncomeData = useMemo(() => {
    const rentalMonthly = (state.rentalProperties || [])
      .filter((r: any) => Number(r.rent || 0) > 0)
      .reduce((s: number, r: any) => s + Number(r.rent || 0), 0);
    const fdMonthly = (state.fixedDeposits || [])
      .reduce((s: number, f: any) => s + (Number(f.principal || 0) * Number(f.rate || 0)) / 100 / 12, 0);
    const totalPassive = rentalMonthly + fdMonthly;
    const passiveRatio = metrics.monthIncome > 0 ? (totalPassive / metrics.monthIncome) * 100 : 0;
    return { rentalMonthly, fdMonthly, totalPassive, passiveRatio };
  }, [state.rentalProperties, state.fixedDeposits, metrics.monthIncome]);

  const taxData80C = useMemo(() => {
    const limit = 150000;
    // Bug fix: filter by FY start date (Apr 1 of FY start year), not calendar year
    // e.g. FY 2025-26 → contributions from 2025-04-01 onwards count
    const fyParts = (state.profile?.fy || "").split("-");
    const fyStartYear = Number(fyParts[0]) || new Date().getFullYear() - 1;
    const fyStartStr = `${fyStartYear}-04-01`;
    const fyEndStr = `${fyStartYear + 1}-03-31`;
    const elss = (state.mutualFunds || [])
      .filter((m: any) => (m.type || m.category || "").toUpperCase().includes("ELSS"))
      .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);
    const ppfThisYear = (state.ppfLedger || [])
      .filter((t: any) => t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal")
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const ppfAnnual = ppfThisYear > 0 ? ppfThisYear :
      (state.ppf || []).reduce((s: number, p: any) => s + Number(p.yearlyContribution || p.annualContribution || 0), 0);
    const licPremium = (state.lic || []).reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);
    const total = Math.min(elss + ppfAnnual + licPremium, limit);
    const remaining = Math.max(0, limit - total);
    return { elss, ppfAnnual, licPremium, total, remaining, limit, progress: total > 0 ? (total / limit) * 100 : 0 };
  }, [state.mutualFunds, state.ppf, state.ppfLedger, state.lic, state.profile?.fy]);

  const goalHealth = useMemo(() => {
    const now = new Date();
    const monthlySavings = Math.max(0, metrics.monthIncome - metrics.monthExpense);
    return (state.goals || []).map((g: any) => {
      const targetAmount = Number(g.targetAmount || g.target || 0);
      const savedAmount = Number(g.savedAmount || g.currentAmount || g.saved || 0);
      const gap = Math.max(0, targetAmount - savedAmount);
      const progress = targetAmount > 0 ? Math.min((savedAmount / targetAmount) * 100, 100) : 0;
      const targetDate = g.targetDate || g.deadline;
      let monthsLeft = 0, monthlyNeeded = 0, onTrack = false;
      if (targetDate) {
        const td = new Date(targetDate);
        monthsLeft = Math.max(0, Math.ceil((td.getTime() - now.getTime()) / (30 * 86400000)));
        monthlyNeeded = monthsLeft > 0 ? gap / monthsLeft : gap;
        onTrack = monthlySavings >= monthlyNeeded && gap > 0 && monthsLeft > 0;
      }
      const achieved = gap === 0;
      return { ...g, gap, monthsLeft, monthlyNeeded, onTrack, progress, targetAmount, savedAmount, achieved };
    });
  }, [state.goals, metrics.monthIncome, metrics.monthExpense]);

  const isPositive = metrics.netWorth >= 0;

  return (
    <div className="tab-content-enter">
      <SectionTitle sub="Executive summary, financial health, and smart insights">
        Financial Analytics
      </SectionTitle>

      {/* Quick Stats Bar */}
      {(() => {
        const items = [
          { label: "Net Worth", value: fmtINRFull(metrics.netWorth), color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust },
          { label: "Savings Rate", value: metrics.savingsRate.toFixed(1) + "%", color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold },
          { label: "Monthly Income", value: fmtINRFull(metrics.monthIncome), color: THEME.sage },
          { label: "Monthly Spend", value: fmtINRFull(metrics.monthExpense), color: THEME.ink },
          { label: "Est. Tax", value: fmtINRFull(metrics.taxDue), color: metrics.taxDue > 0 ? THEME.rust : THEME.sage },
          ...(momNetWorthDelta ? [{
            label: "MoM Change",
            value: `${momNetWorthDelta.delta >= 0 ? "+" : ""}${fmtINRFull(momNetWorthDelta.delta)}`,
            color: momNetWorthDelta.delta >= 0 ? THEME.sage : THEME.rust,
          }] : []),
          ...(metrics.foir > 0 ? [{
            label: "FOIR",
            value: `${metrics.foir.toFixed(0)}%`,
            color: metrics.foir > 50 ? THEME.rust : metrics.foir > 40 ? THEME.gold : THEME.sage,
          }] : []),
        ];
        return (
          <div style={{ background: "transparent", overflowX: "auto", marginBottom: 24 }} className="no-scrollbar">
            <div style={{ display: "flex", alignItems: "center", minWidth: "max-content", background: "var(--surface-0)", borderRadius: 12, padding: "12px 10px", border: `1px solid ${THEME.line}`, boxShadow: "var(--shadow-sm)" }}>
              {items.map(({ label, value, color }, idx) => (
                <React.Fragment key={label}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 24px" }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: THEME.muted, fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{value}</span>
                  </div>
                  {idx < items.length - 1 && (
                    <div style={{ width: 1, height: 28, background: THEME.line, flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Modern Sliding Segmented Control */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 6, background: THEME.line, padding: 4, borderRadius: 12, overflowX: "auto" }} className="no-scrollbar">
          {subs.map((s) => {
            const Icon = s.icon;
            const active = sub === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSub(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? THEME.darkInk : "transparent",
                  color: active ? THEME.accent : THEME.muted,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.25s var(--ease-premium)",
                  boxShadow: active ? "var(--shadow-md)" : "none",
                }}
              >
                <Icon size={16} />
                <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{s.label}</span>
              </button>
            );
          })}
        </div>
        <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => setShowReport(true)}>
          Monthly Report
        </Button>
      </div>

      {/* ────────────────── SUB-TAB: DASHBOARD ────────────────── */}
      {sub === "dashboard" && (
        <>
          {smartInsights.length > 0 && (
            <div style={{ overflowX: "auto", marginBottom: 20 }} className="no-scrollbar">
              <div style={{ display: "flex", gap: 10, minWidth: "max-content" }}>
                {smartInsights.map((ins: any, i: number) => {
                  const Icon = ins.icon;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 12, background: ins.bg, border: `1px solid ${ins.color}28`, flexShrink: 0 }}>
                      <Icon size={15} color={ins.color} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: ins.color, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>{ins.title}</div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2, fontWeight: 500 }}>{ins.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="animate-fade-in-up bento-grid">
            {/* Hero Card */}
            <Card variant="hero" className="bento-col-12" style={{ padding: "32px 40px", background: "var(--t-darkInk)", color: "#fff", position: "relative", overflow: "hidden" }}>
              {netWorthTrend.filter((t: any) => t.value > 0).length > 2 && (
                <div style={{ position: "absolute", top: 0, right: 0, width: 240, height: 110, opacity: 0.10, pointerEvents: "none", zIndex: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={netWorthTrend.slice(-6)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="heroSparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34D399" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="#34D399" strokeWidth={2.5} fill="url(#heroSparkGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 20, position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: isPositive ? "#34D399" : "#FB7185", boxShadow: `0 0 10px ${isPositive ? "rgba(52,211,153,0.5)" : "rgba(251,113,133,0.5)"}` }} />
                  <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>Wealth Overview</span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>

              <div style={{ position: "relative", zIndex: 1, marginBottom: 32 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Total Net Worth</div>
                <div style={{ fontSize: "clamp(42px, 5.5vw, 72px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.045em", color: "#fff" }}>
                  {fmtINRFull(metrics.netWorth)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#34D399", fontSize: 13, fontWeight: 700 }}>
                    <TrendingUp size={14} />
                    {((metrics.mfValue + metrics.stockValue) / (metrics.totalAssets || 1) * 100).toFixed(1)}% equity ratio
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                    · Total assets {fmtINRFull(metrics.totalAssets)}
                  </div>
                  {momNetWorthDelta && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: momNetWorthDelta.delta >= 0 ? "#34D399" : "#F87171" }}>
                      · {momNetWorthDelta.delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {momNetWorthDelta.delta >= 0 ? "+" : ""}{fmtINR(momNetWorthDelta.delta)} MoM ({momNetWorthDelta.pct >= 0 ? "+" : ""}{momNetWorthDelta.pct.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px 32px", position: "relative", zIndex: 1, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <HeroStat label="Bank Cash" value={metrics.cashInBanks} />
                <HeroStat label="Fixed Deposits" value={metrics.fdValue} />
                <HeroStat label="Mutual Funds" value={metrics.mfValue} />
                <HeroStat label="Stocks" value={metrics.stockValue} />
                <HeroStat label="PPF / NPS / EPF" value={metrics.ppfValue + metrics.npsValue + metrics.epfValue} />
                <HeroStat label="Card Dues" value={metrics.ccOutstanding} negative />
                <HeroStat label="Loans Taken" value={metrics.loansTakenValue} negative />
                <HeroStat label="Subs / Mo" value={metrics.subTotal} negative />
              </div>
            </Card>

            {/* Core Stats Grid Row */}
            <div className="bento-col-12" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
              {/* 1. SAVINGS RATE */}
              <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Savings Rate</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%" }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={THEME.line} strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={metrics.savingsRate >= 20 ? THEME.sage : THEME.gold} strokeWidth="4" strokeDasharray={`${Math.max(0, Math.min(100, metrics.savingsRate))}, 100`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{metrics.savingsRate.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold, lineHeight: 1, marginBottom: 6, letterSpacing: "-0.02em" }}>{metrics.savingsRate.toFixed(1)}%</div>
                    <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 8, fontWeight: 500 }}>of monthly income</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: metrics.savingsRate >= 20 ? THEME.sage : metrics.savingsRate >= 10 ? THEME.gold : THEME.rust }}>{metrics.savingsRate >= 20 ? "On track" : "Needs attention"}</div>
                  </div>
                </div>
              </Card>

              {/* 2. DEBT-TO-ASSET */}
              <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Debt-to-Asset Ratio</div>
                <div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: metrics.debtToAssetRatio < 25 ? THEME.sage : metrics.debtToAssetRatio < 40 ? THEME.gold : THEME.rust, lineHeight: 1, marginBottom: 16, letterSpacing: "-0.02em" }}>{metrics.debtToAssetRatio.toFixed(1)}<span style={{ fontSize: 24 }}>%</span></div>
                  <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.5, fontWeight: 500 }}>Healthy if under 40% · Your liabilities {fmtINRFull(metrics.totalLiabilities)}</div>
                </div>
              </Card>

              {/* 3. LIQUIDITY SCORE — uses liquidAssets (cash + MF + stocks), not just cash */}
              <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Liquidity Score</div>
                <div>
                  {(() => {
                    const liquid = metrics.liquidAssets;
                    const locked = metrics.lockedAssets;
                    const ratio = metrics.totalAssets > 0 ? (liquid / metrics.totalAssets) * 100 : 0;
                    const ratioColor = ratio >= 30 ? THEME.sage : ratio >= 15 ? THEME.gold : THEME.rust;
                    return (
                      <>
                        <div style={{ fontSize: 38, fontWeight: 900, color: ratioColor, lineHeight: 1, marginBottom: 10, letterSpacing: "-0.02em" }}>{ratio.toFixed(1)}<span style={{ fontSize: 24 }}>%</span></div>
                        <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6, fontWeight: 500 }}>
                          Cash {fmtINRFull(metrics.cashInBanks)}<br />
                          MF+Stocks {fmtINRFull(metrics.mfValue + metrics.stockValue)}<br />
                          Locked {fmtINRFull(locked)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Card>

              {/* 4. INVESTMENT P&L */}
              <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Investment P&L</div>
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
                        <div style={{ fontSize: 34, fontWeight: 900, color: c, lineHeight: 1, marginBottom: 10, letterSpacing: "-0.02em" }}>{isPos ? "+" : ""}{fmtINRFull(pnl)}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: c, marginBottom: 8, display: "flex", alignItems: "center", gap: 2 }}>
                          {isPos ? <ChevronUp size={18} strokeWidth={3} /> : <ChevronDown size={18} strokeWidth={3} />}
                          {Math.abs(returnPct).toFixed(1)}% overall return
                        </div>
                        <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>Unrealised · Invested {fmtINRFull(invested)}</div>
                      </>
                    );
                  })()}
                </div>
              </Card>
            </div>

            {/* Row of Health, Dues, Streak */}
            <Card className="bento-col-4 bento-row-2" style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="section-label">Financial Health</div>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: dashboardData.scoreColor }}>
                    {dashboardData.hasData ? dashboardData.totalScore : "—"}
                  </div>
                  {dashboardData.hasData && (
                    <div style={{ fontSize: 18, fontWeight: 700, color: THEME.muted, lineHeight: 1 }}>/100</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: dashboardData.scoreColor }}>
                    {!dashboardData.hasData ? "No Data Yet" : dashboardData.totalScore >= 75 ? "Excellent" : dashboardData.totalScore >= 50 ? "Good" : "Needs Work"}
                  </div>
                  <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>Overall Score</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {dashboardData.subScores.map((s) => (
                  <div key={s.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: THEME.muted, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontWeight: 800, color: s.color }}>{s.score}/{s.max}</span>
                    </div>
                    {s.hint && <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 5, opacity: 0.8 }}>{s.hint}</div>}
                    <div className="progress-track"><div className="progress-fill" style={{ width: s.pct + "%", background: s.color }} /></div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bento-col-5 bento-row-2" style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="section-label">Upcoming Dues</div>
              {dashboardData.dues.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: THEME.muted, fontSize: 13, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>No major dues coming up</div>
              ) : (
                <div style={{ display: "grid", gap: 12, flex: 1, alignContent: "flex-start" }}>
                  {dashboardData.dues.slice(0, 5).map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: d.isFdMaturity ? "rgba(52,211,153,0.04)" : "rgba(128,128,128,0.04)", border: d.isFdMaturity ? `1px solid ${THEME.sage}22` : "none" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{d.date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: d.isFdMaturity ? THEME.sage : THEME.ink }}>{fmtINR(d.amount)}</div>
                        {d.isFdMaturity
                          ? <Badge variant="sage" style={{ fontSize: 10, marginTop: 4 }}>Matures in {d.daysLeft}d</Badge>
                          : <Badge variant={d.daysLeft <= 5 ? "rust" : "gold"} style={{ fontSize: 10, marginTop: 4 }}>{d.daysLeft}d left</Badge>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="bento-col-3 bento-row-2" style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
              <div className="section-label" style={{ textAlign: "center" }}>Savings Streak</div>
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>{dashboardData.streakEmoji}</div>
                <div style={{ fontSize: 56, fontWeight: 900, color: THEME.sage, lineHeight: 1 }}>{dashboardData.streak}</div>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 8, fontWeight: 600 }}>Months Saved</div>
                <Badge variant="sage" style={{ marginTop: 16, padding: "6px 12px", fontSize: 12 }}>{dashboardData.streakMsg}</Badge>
              </div>
            </Card>

            {/* Recent Transactions */}
            <Card className="bento-col-12" style={{ padding: 24, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 0 }}>Recent Ledger Activity</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge variant="muted">{state.transactions.length} total</Badge>
                  {state.transactions.length > 5 && (
                    <button
                      onClick={() => setShowAllTxns(prev => !prev)}
                      style={{ fontSize: 11, color: THEME.accent, background: "none", border: `1px solid ${THEME.accent}44`, cursor: "pointer", fontWeight: 700, padding: "3px 10px", borderRadius: 6, transition: "all 0.2s ease" }}
                    >
                      {showAllTxns ? "Show less" : `Show all ${state.transactions.length}`}
                    </button>
                  )}
                </div>
              </div>
              {state.transactions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: THEME.muted, fontSize: 13 }}>No transactions yet</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {state.transactions
                    .slice()
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, showAllTxns ? undefined : 5)
                    .map((t: any) => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: t.type === "credit" ? "color-mix(in srgb, var(--t-sage) 12%, transparent)" : "color-mix(in srgb, var(--t-rust) 12%, transparent)", color: t.type === "credit" ? THEME.sage : THEME.rust, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {t.type === "credit" ? <TrendingUp size={18} /> : <Receipt size={18} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{t.note || t.category}</div>
                            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{t.date} · {t.category}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: t.type === "credit" ? THEME.sage : THEME.ink }}>
                            {t.type === "credit" ? "+" : "-"}{fmtINR(t.amount)}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: t.type === "credit" ? THEME.sage : THEME.rust, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {t.type === "credit" ? "Credit" : "Debit"}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ────────────────── SUB-TAB: TRENDS ────────────────── */}
      {sub === "trends" && (
        <div className="animate-fade-in-up">
          {/* Net Worth Growth */}
          <Card style={{ marginBottom: 28, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Net Worth Growth</div>
              <div style={{ display: "flex", gap: 3, background: THEME.line, padding: 3, borderRadius: 8 }}>
                {(["3M", "6M", "12M", "All"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setTrendPeriod(p)}
                    style={{
                      padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                      fontSize: 11, fontWeight: 700,
                      background: trendPeriod === p ? THEME.accent : "transparent",
                      color: trendPeriod === p ? "#fff" : THEME.muted,
                      transition: "all 0.2s ease"
                    }}
                  >{p}</button>
                ))}
              </div>
            </div>
            {filteredNetWorthTrend.length === 0 || filteredNetWorthTrend.every(t => t.value === 0) ? (
              <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12 }}>
                Not enough history to show net worth trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={filteredNetWorthTrend}>
                  <defs>
                    <linearGradient id="gNw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.accent} stopOpacity={0.4} /><stop offset="100%" stopColor={THEME.accent} stopOpacity={0} /></linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={THEME.accent} floodOpacity="0.5" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} contentStyle={{ background: "var(--surface-0)", border: "1px solid var(--t-line)", borderRadius: 12, boxShadow: "var(--shadow-xl)" }} />
                  <Area type="monotone" dataKey="value" stroke={THEME.accent} strokeWidth={3} fill="url(#gNw)" style={{ filter: "url(#glow)" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Historical P&L Bar Chart */}
          <Card style={{ marginBottom: 28, padding: 24 }}>
            <div className="section-label">Monthly P&L (Last 6 Months)</div>
            {trendData.filter(t => t.income > 0 || t.expense > 0).length === 0 ? (
              <div style={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12 }}>
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
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={THEME.sage} floodOpacity="0.4" />
                    </filter>
                    <filter id="glow-rust" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={THEME.rust} floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtINR} tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} cursor={{ fill: THEME.line, opacity: 0.4 }} contentStyle={{ background: "var(--surface-0)", border: "1px solid var(--t-line)", borderRadius: 12, boxShadow: "var(--shadow-xl)" }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="income" name="Income" fill="url(#gIncome)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-sage)" }} />
                  <Bar dataKey="expense" name="Expense" fill="url(#gExpense)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-rust)" }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
            {/* Monthly Income vs Expense — uses unique gradient IDs (gIncome2/gExpense2) to avoid conflict with Monthly P&L chart above */}
            <Card style={{ padding: 24 }}>
              <div className="section-label">Monthly Income vs Expense</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendData.slice(-6)}>
                  <defs>
                    <linearGradient id="gIncome2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="gExpense2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.rust} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={THEME.rust} stopOpacity={0.4} />
                    </linearGradient>
                    <filter id="glow-sage2" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={THEME.sage} floodOpacity="0.4" />
                    </filter>
                    <filter id="glow-rust2" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={THEME.rust} floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtINR} tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} cursor={{ fill: THEME.line, opacity: 0.4 }} contentStyle={{ background: "var(--surface-0)", border: "1px solid var(--t-line)", borderRadius: 12, boxShadow: "var(--shadow-xl)" }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="income" name="Income" fill="url(#gIncome2)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-sage2)" }} />
                  <Bar dataKey="expense" name="Expense" fill="url(#gExpense2)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-rust2)" }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Portfolio Return */}
            <Card style={{ padding: 24 }}>
              <div className="section-label">Portfolio Return</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: "Mutual Funds", current: metrics.mfValue, invested: metrics.mfInvested },
                  { name: "Stocks", current: metrics.stockValue, invested: metrics.stockInvested }
                ]}>
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
                  <XAxis dataKey="name" tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtINR} tick={{ fill: THEME.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} cursor={{ fill: THEME.line, opacity: 0.4 }} contentStyle={{ background: "var(--surface-0)", border: "1px solid var(--t-line)", borderRadius: 12, boxShadow: "var(--shadow-xl)" }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="current" name="Current Value" fill="url(#gCurrent)" radius={[4, 4, 0, 0]} style={{ filter: "url(#glow-sage)" }} />
                  <Bar dataKey="invested" name="Invested" fill="url(#gInvested)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* YTD Cumulative block */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>Year-to-Date Performance</div>
                <div style={{ fontSize: 12, color: THEME.muted }}>Jan – {ytdData.monthName} {new Date().getFullYear()} · {ytdData.monthsElapsed} month{ytdData.monthsElapsed > 1 ? "s" : ""}</div>
              </div>
              <BarChart2 size={18} color={THEME.muted} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              {[
                { label: "YTD Income", value: fmtINRFull(ytdData.ytdIncome), color: THEME.sage },
                { label: "YTD Expense", value: fmtINRFull(ytdData.ytdExpense), color: THEME.rust },
                { label: "YTD Savings", value: fmtINRFull(ytdData.ytdSavings), color: ytdData.ytdSavings >= 0 ? THEME.sage : THEME.rust },
                { label: "YTD Savings Rate", value: ytdData.ytdSavingsRate.toFixed(1) + "%", color: ytdData.ytdSavingsRate >= 20 ? THEME.sage : ytdData.ytdSavingsRate >= 10 ? THEME.gold : THEME.rust },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: 16, background: "rgba(128,128,128,0.04)", borderRadius: 12, borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color, letterSpacing: "-0.02em" }}>{value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ────────────────── SUB-TAB: ALLOCATION ────────────────── */}
      {sub === "allocation" && (
        <div className="animate-fade-in-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 28 }}>
            {/* Asset Allocation */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 2 }}>Asset Allocation</div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    {selectedAssetClass ? `Drill down: ${selectedAssetClass}` : "Interactive asset diversification map"}
                  </div>
                </div>
                {selectedAssetClass && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedAssetClass(null); setActiveAssetIndex(null); }} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px" }}>
                    <ChevronLeft size={14} /> Back
                  </Button>
                )}
              </div>
              
              {assetBreakdown?.length === 0 ? (
                <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12, textAlign: "center", padding: 24 }}>
                  Add assets in Bank Accounts, Demat, or Fixed Income to see allocation.
                </div>
              ) : (
                <div className="allocation-interactive-container" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 24, minHeight: 300 }}>
                  {/* Left Side: Donut Chart with central display */}
                  <div style={{ flex: "1 1 240px", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
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
                            setSelectedAssetClass(selectedName === selectedAssetClass ? null : selectedName);
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
                                opacity={selectedAssetClass ? (isSelected ? 1 : 0.4) : (activeAssetIndex !== null ? (isHovered ? 1 : 0.6) : 1)}
                                style={{
                                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  transform: isHovered || isSelected ? "scale(1.03)" : "scale(1)",
                                  transformOrigin: "center"
                                }}
                              />
                            );
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Central display inside the donut hole */}
                    <div style={{
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
                      zIndex: 2
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                        {activeAssetIndex !== null ? assetBreakdown[activeAssetIndex]?.name : (selectedAssetClass ? selectedAssetClass : "Total Assets")}
                      </span>
                      <span style={{ fontSize: 17, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                        {fmtINRFull(
                          activeAssetIndex !== null 
                            ? assetBreakdown[activeAssetIndex]?.value 
                            : (selectedAssetClass 
                                ? (assetBreakdown.find(x => x.name === selectedAssetClass)?.value || 0) 
                                : metrics.totalAssets)
                        )}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, marginTop: 2 }}>
                        {(() => {
                          const val = activeAssetIndex !== null 
                            ? assetBreakdown[activeAssetIndex]?.value 
                            : (selectedAssetClass 
                                ? (assetBreakdown.find(x => x.name === selectedAssetClass)?.value || 0) 
                                : metrics.totalAssets);
                          const total = metrics.totalAssets || 1;
                          return `${((val / total) * 100).toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Interactive detail list and sub-asset drill-down */}
                  <div style={{ flex: "1 1 240px", maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
                    {selectedAssetClass ? (
                      // DRILL DOWN SUB-LIST FOR SELECTED CLASS
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${THEME.line}`, paddingBottom: 6 }}>
                          <span>Holding Breakdown</span>
                          <span>Value</span>
                        </div>
                        {(() => {
                          const subList = getSubAssets(selectedAssetClass);
                          if (subList.length === 0) {
                            return <div style={{ fontSize: 12, color: THEME.muted, padding: "12px 0", textAlign: "center" }}>No holdings recorded</div>;
                          }
                          return subList.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                              <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                {item.sub && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{item.sub}</div>}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{fmtINR(item.value)}</span>
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
                                background: isHovered ? "rgba(128,128,128,0.05)" : "rgba(128,128,128,0.02)", 
                                border: isHovered ? `1px solid ${color}` : `1px solid ${THEME.line}`,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>{pct}%</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginLeft: 8 }}>{fmtINR(item.value)}</span>
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
              <div style={{ height: 300, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700 }}>Total Assets</span>
                    <span style={{ fontWeight: 800, color: THEME.sage }}>{fmtINRFull(metrics.totalAssets)}</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill progress-fill-sage" style={{ width: "100%" }} /></div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700 }}>Total Liabilities</span>
                    <span style={{ fontWeight: 800, color: THEME.rust }}>{fmtINRFull(metrics.totalLiabilities)}</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill progress-fill-rust" style={{ width: (metrics.totalAssets > 0 ? (metrics.totalLiabilities / metrics.totalAssets) * 100 : 0) + "%" }} /></div>
                </div>
                <div style={{ textAlign: "center", paddingTop: 20, borderTop: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>Net Worth Equity</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: isPositive ? THEME.accent : THEME.rust }}>{fmtINRFull(metrics.netWorth)}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Last Trading Day Performance */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 12 }}>
              Last Trading Day Performance:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {/* Gaining Card */}
              <Card style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: THEME.sage }}>
                  <span style={{ fontSize: 14 }}>▲</span> {lastTradingDayPerformance.gainingCount} Stock Gaining
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: THEME.ink }}>
                  {lastTradingDayPerformance.topGainer ? lastTradingDayPerformance.topGainer.name : "-"}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    ₹{lastTradingDayPerformance.topGainer ? Number(lastTradingDayPerformance.topGainer.price.toFixed(1)).toLocaleString("en-IN") : "0"}
                  </span>
                  {lastTradingDayPerformance.topGainer && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.sage }}>
                      +{lastTradingDayPerformance.topGainer.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </Card>

              {/* Losing Card */}
              <Card style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: THEME.rust }}>
                  <span style={{ fontSize: 14 }}>▼</span> {lastTradingDayPerformance.losingCount} Stock Losing
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: THEME.ink }}>
                  {lastTradingDayPerformance.topLoser ? lastTradingDayPerformance.topLoser.name : "-"}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    ₹{lastTradingDayPerformance.topLoser ? Number(lastTradingDayPerformance.topLoser.price.toFixed(1)).toLocaleString("en-IN") : "0"}
                  </span>
                  {lastTradingDayPerformance.topLoser && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.rust }}>
                      {lastTradingDayPerformance.topLoser.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </Card>

              {/* No Change Card */}
              <Card style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: THEME.muted }}>
                  ● {lastTradingDayPerformance.noChangeCount} Stock No Change
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: THEME.muted }}>
                  -
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    ₹0
                  </span>
                </div>
              </Card>
            </div>
          </div>

          {/* Equity Insights (Sectors and Market Caps) */}
          <Card style={{ padding: 24, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>Equity Sector & Cap Insights</div>
                <div style={{ fontSize: 12, color: THEME.muted }}>Portfolio diversification by sector and market capitalization</div>
              </div>
              <Badge variant="muted">Live Data</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              {/* Sector Breakdown */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <Building2 size={16} /> Top 10 Sectors
                </div>
                {metrics.stockSectorBreakdown?.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12 }}>
                    Add stocks in the Demat tab to see sector analysis
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {metrics.stockSectorBreakdown.slice(0, 10).map((s: any, i: number) => {
                      const maxVal = metrics.stockSectorBreakdown[0].value;
                      const pct = (s.value / maxVal) * 100;
                      return (
                        <div key={s.name}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                            <span style={{ fontWeight: 600 }}>{s.name}</span>
                            <span style={{ fontWeight: 700, color: THEME.muted }}>{fmtINR(s.value)}</span>
                          </div>
                          <div style={{ height: 6, background: THEME.line, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: pct + "%", background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Market Cap Breakdown */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={16} /> Market Cap Allocation
                  </span>
                  {selectedCapClass && (
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedCapClass(null); setActiveCapIndex(null); }} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 2, padding: "2px 6px" }}>
                      <ChevronLeft size={12} /> Back
                    </Button>
                  )}
                </div>
                {metrics.stockCapBreakdown?.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12 }}>
                    No market cap data available
                  </div>
                ) : (
                  <div className="allocation-interactive-container" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
                    {/* Left Side: Donut Chart with central HUD */}
                    <div style={{ flex: "1 1 160px", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
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
                              setSelectedCapClass(selectedName === selectedCapClass ? null : selectedName);
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
                                  opacity={selectedCapClass ? (isSelected ? 1 : 0.4) : (activeCapIndex !== null ? (isHovered ? 1 : 0.6) : 1)}
                                  style={{
                                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    transform: isHovered || isSelected ? "scale(1.03)" : "scale(1)",
                                    transformOrigin: "center"
                                  }}
                                />
                              );
                            })}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* HUD overlay inside the donut hole */}
                      <div style={{
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
                        zIndex: 2
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                          {activeCapIndex !== null ? metrics.stockCapBreakdown[activeCapIndex]?.name : (selectedCapClass ? selectedCapClass : "Total Stocks")}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                          {fmtINR(
                            activeCapIndex !== null 
                              ? metrics.stockCapBreakdown[activeCapIndex]?.value 
                              : (selectedCapClass 
                                  ? (metrics.stockCapBreakdown.find(x => x.name === selectedCapClass)?.value || 0) 
                                  : metrics.stockValue)
                          )}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: THEME.sage, marginTop: 1 }}>
                          {(() => {
                            const val = activeCapIndex !== null 
                              ? metrics.stockCapBreakdown[activeCapIndex]?.value 
                              : (selectedCapClass 
                                  ? (metrics.stockCapBreakdown.find(x => x.name === selectedCapClass)?.value || 0) 
                                  : metrics.stockValue);
                            const total = metrics.stockValue || 1;
                            return `${((val / total) * 100).toFixed(1)}%`;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Right Side: Interactive detail list & holdings drill-down */}
                    <div style={{ flex: "1 1 180px", maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                      {selectedCapClass ? (
                        // DRILL DOWN LIST (STOCKS UNDER ACTIVE CAP)
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${THEME.line}`, paddingBottom: 4 }}>
                            <span>Stock</span>
                            <span>Value</span>
                          </div>
                          {(() => {
                            const subList = getStockCapAssets(selectedCapClass);
                            if (subList.length === 0) {
                              return <div style={{ fontSize: 11, color: THEME.muted, padding: "8px 0", textAlign: "center" }}>No holdings</div>;
                            }
                            return subList.map((item: any, idx: number) => (
                              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderRadius: 6, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                                <div style={{ minWidth: 0, flex: 1, marginRight: 6 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                  {item.sub && <div style={{ fontSize: 9, color: THEME.muted, marginTop: 1 }}>{item.sub}</div>}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>{fmtINR(item.value)}</span>
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
                                  background: isHovered ? "rgba(128,128,128,0.05)" : "rgba(128,128,128,0.02)", 
                                  border: isHovered ? `1px solid ${color}` : `1px solid ${THEME.line}`,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, fontWeight: 700, color: THEME.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                                  <span style={{ fontSize: 9, color: THEME.muted, fontWeight: 600 }}>{pct}%</span>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 800, color: THEME.ink, marginLeft: 6 }}>{fmtINR(item.value)}</span>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>Top 10 Portfolio Holdings</div>
                <div style={{ fontSize: 12, color: THEME.muted }}>Your largest stock holdings by current value and portfolio share</div>
              </div>
              <Badge variant="accent">{topHoldings.length} stocks</Badge>
            </div>
            {topHoldings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12 }}>
                Add stocks in the Demat tab to see top holdings breakdown
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px 24px" }}>
                {topHoldings.map((h: any) => (
                  <div key={h.yfSym} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                    <StockLogo yfSym={h.yfSym} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{h.base}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{fmtINR(h.totalValue)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="progress-track" style={{ flex: 1, height: 6, margin: 0, background: THEME.line }}>
                          <div className="progress-fill" style={{ width: `${h.percentage}%`, height: 6, background: THEME.accent }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, minWidth: 35, textAlign: "right" }}>{h.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Passive Income Breakdown */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>Passive Income Ratio</div>
                <div style={{ fontSize: 12, color: THEME.muted }}>Rent + FD interest vs active income</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: passiveIncomeData.passiveRatio >= 50 ? THEME.sage : passiveIncomeData.passiveRatio >= 20 ? THEME.gold : THEME.accent, letterSpacing: "-0.02em" }}>{passiveIncomeData.passiveRatio.toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, textTransform: "uppercase" as const }}>of income</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Rental / Mo", value: passiveIncomeData.rentalMonthly, icon: Building2, color: "#059669", bg: "rgba(5,150,105,0.08)" },
                { label: "FD Interest / Mo", value: passiveIncomeData.fdMonthly, icon: Landmark, color: "#d97706", bg: "rgba(217,119,6,0.08)" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} style={{ padding: 16, background: bg, borderRadius: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={14} color="#fff" />
                    </div>
                    <span style={{ fontSize: 11, color, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.02em" }}>{fmtINRFull(value)}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 16px", background: "rgba(128,128,128,0.04)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 6 }}>Total Passive / Month</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: THEME.sage, letterSpacing: "-0.02em" }}>{fmtINRFull(passiveIncomeData.totalPassive)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 6 }}>50%+ → Semi-FI</div>
                <div style={{ fontSize: 11, color: THEME.muted }}>100% → Full FI</div>
              </div>
            </div>
          </Card>

          {/* Portfolio Rebalancing */}
          <Card style={{ padding: 24, marginTop: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>Portfolio Rebalancing</div>
                <div style={{ fontSize: 12, color: THEME.muted }}>Set target allocation and see how much to buy/sell per asset class</div>
              </div>
              <Badge variant="accent">Target vs Actual</Badge>
            </div>

            {(() => {
              const equity = (metrics.mfValue || 0) + (metrics.stockValue || 0);
              const debt = (metrics.fdValue || 0) + (metrics.rdValue || 0) + (metrics.bondValue || 0) + (metrics.ppfValue || 0) + (metrics.npsValue || 0) + (metrics.epfValue || 0) + (metrics.licValue || 0) + (metrics.investmentValue || 0);
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
                { key: "equity", label: "Equity", actualPct: actual.equity, actualVal: equity, color: "#6366f1", icon: TrendingUp },
                { key: "debt", label: "Debt", actualPct: actual.debt, actualVal: debt, color: "#f59e0b", icon: Landmark },
                { key: "cash", label: "Cash", actualPct: actual.cash, actualVal: cash, color: "#22c55e", icon: Activity },
                { key: "other", label: "Other", actualPct: actual.other, actualVal: other, color: "#94a3b8", icon: Receipt },
              ] as const;

              const totalTarget = rebalTargets.equity + rebalTargets.debt + rebalTargets.cash + rebalTargets.other;

              return (
                <>
                  {/* Sliders */}
                  <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                    {classes.map(({ key, label, actualPct, color }) => {
                      const targetPct = rebalTargets[key];
                      return (
                        <div key={key}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: 12, color: THEME.muted }}>Actual: <b style={{ color: THEME.ink }}>{actualPct.toFixed(1)}%</b></span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, color }}>Target:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={targetPct}
                                  onChange={e => setRebalTargets(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                                  style={{ width: 52, padding: "2px 6px", borderRadius: 6, border: `1px solid ${color}33`, background: `${color}08`, fontSize: 12, fontWeight: 700, color, outline: "none", textAlign: "center" as const }}
                                />
                                <span style={{ fontSize: 12, color }}>%</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ position: "relative", height: 10, background: THEME.line, borderRadius: 5, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(actualPct, 100)}%`, background: color, borderRadius: 5, opacity: 0.4 }} />
                            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: 2, marginLeft: `${Math.min(targetPct, 100)}%`, background: color, boxShadow: `0 0 4px ${color}` }} />
                          </div>
                        </div>
                      );
                    })}
                    {totalTarget !== 100 && (
                      <div style={{ fontSize: 11, color: THEME.rust, fontWeight: 600 }}>Targets sum to {totalTarget}% — adjust to total 100%</div>
                    )}
                  </div>

                  {/* Action plan table */}
                  <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 16 }}>
                    <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 12 }}>Rebalancing Action Plan</div>
                    {total === 0 ? (
                      <div style={{ textAlign: "center", fontSize: 13, color: THEME.muted, padding: "16px 0" }}>Add assets to see rebalancing recommendations</div>
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
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 10, background: isBuy ? "rgba(52,211,153,0.04)" : "rgba(239,68,68,0.04)", border: `1px solid ${isBuy ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.12)"}` }}>
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                                  {actualPct.toFixed(1)}% → target {targetPct}%
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: isBuy ? THEME.sage : THEME.rust }}>
                                  {isBuy ? "+" : "−"}{fmtINR(absDiff)}
                                </div>
                                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>{isBuy ? "Buy / Add" : "Reduce"}</div>
                              </div>
                            </div>
                          );
                        })}
                        {classes.every(({ key, actualVal }) => Math.abs(rebalTargets[key] / 100 * total - actualVal) < 1000) && (
                          <div style={{ textAlign: "center", fontSize: 13, color: THEME.sage, padding: "12px 0" }}>Portfolio is balanced — all classes within ₹1K of target</div>
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
        <div className="animate-fade-in-up">
          {/* FIRE Progress */}
          <Card style={{ padding: 24, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>FIRE Progress — Financial Independence</div>
                <div style={{ fontSize: 12, color: THEME.muted }}>25× annual expenses rule · the corpus you need to never work again</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: fireData.progress >= 100 ? THEME.sage : THEME.accent, letterSpacing: "-0.02em" }}>{fireData.progress.toFixed(1)}%</div>
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>achieved</div>
              </div>
            </div>
            {fireData.fireCorpus > 0 ? (
              <>
                <div style={{ height: 10, background: THEME.line, borderRadius: 5, overflow: "hidden", marginBottom: 20 }}>
                  <div style={{ height: "100%", width: fireData.progress + "%", background: fireData.progress >= 100 ? THEME.sage : fireData.progress >= 50 ? THEME.gold : THEME.accent, borderRadius: 5, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
                  {[
                    { label: "FIRE Corpus Needed", value: fmtINRFull(fireData.fireCorpus), sub: `25 × annual spend`, color: THEME.ink },
                    { label: "Annual Spend", value: fmtINRFull(fireData.annualExpense), sub: `${fmtINR(metrics.monthExpense)}/mo`, color: THEME.ink },
                    { label: "Current Net Worth", value: fmtINRFull(metrics.netWorth), sub: "your wealth base", color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust },
                    { label: "Remaining to FIRE", value: fireData.fireCorpus > metrics.netWorth ? fmtINRFull(fireData.fireCorpus - Math.max(metrics.netWorth, 0)) : "FI Achieved!", sub: fireData.fireCorpus > metrics.netWorth ? "gap to close" : "congratulations", color: fireData.fireCorpus > metrics.netWorth ? THEME.rust : THEME.sage },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} style={{ padding: "14px 16px", background: "rgba(128,128,128,0.04)", borderRadius: 12 }}>
                      <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: "-0.01em" }}>{value}</div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                Add monthly expenses to calculate your FIRE corpus target
              </div>
            )}

            {fireData.fireCorpus > 0 && (
              <div style={{ marginTop: 20, padding: "16px 20px", background: "rgba(99,102,241,0.06)", borderRadius: 12, border: "1px solid rgba(99,102,241,0.18)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#818CF8", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 12 }}>
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
                        flex: 1, padding: "8px 12px", borderRadius: 8,
                        border: "1px solid rgba(99,102,241,0.3)",
                        background: "var(--surface-0)", color: THEME.ink, fontSize: 13, outline: "none"
                      }}
                    />
                    <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 500, whiteSpace: "nowrap" }}>extra/month</span>
                  </div>
                  {(() => {
                    const currentSavings = Math.max(0, metrics.monthIncome - metrics.monthExpense);
                    const totalSavings = currentSavings + fireWhatIfExtra;
                    const gap = Math.max(0, fireData.fireCorpus - Math.max(metrics.netWorth, 0));
                    if (gap <= 0) return <div style={{ fontSize: 12, color: THEME.sage, fontWeight: 700 }}>FIRE already achieved!</div>;
                    if (totalSavings <= 0) return <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>Enter an amount above</div>;
                    const r = 0.12 / 12;
                    const months = Math.log(1 + (gap * r) / totalSavings) / Math.log(1 + r);
                    const years = months / 12;
                    const baseYrs = currentSavings > 0
                      ? Math.log(1 + (gap * r) / currentSavings) / Math.log(1 + r) / 12
                      : null;
                    const saved = baseYrs !== null && isFinite(baseYrs) ? baseYrs - years : null;
                    return isFinite(years) && years > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 16px", background: "rgba(99,102,241,0.08)", borderRadius: 10 }}>
                        <div>
                          <div style={{ fontSize: 26, fontWeight: 900, color: "#818CF8", letterSpacing: "-0.03em", lineHeight: 1 }}>{years.toFixed(1)}</div>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, textTransform: "uppercase" as const }}>years to FIRE</div>
                        </div>
                        {saved !== null && isFinite(saved) && saved > 0.1 && (
                          <div style={{ fontSize: 12, color: THEME.sage, fontWeight: 700 }}>
                            {saved.toFixed(1)} yrs faster
                          </div>
                        )}
                      </div>
                    ) : <div style={{ fontSize: 12, color: THEME.muted }}>Calculating…</div>;
                  })()}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 10 }}>* Assumes 12% p.a. compounded returns</div>
              </div>
            )}
          </Card>

          {/* 80C Tax Deduction */}
          <Card style={{ padding: 24, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>80C Tax Deduction Utilization</div>
                <div style={{ fontSize: 12, color: THEME.muted }}>Annual ₹1.5L deduction limit</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: taxData80C.progress >= 100 ? THEME.sage : THEME.accent, letterSpacing: "-0.02em" }}>{taxData80C.progress.toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600, textTransform: "uppercase" as const }}>used</div>
              </div>
            </div>
            <div style={{ height: 8, background: THEME.line, borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ height: "100%", width: taxData80C.progress + "%", background: taxData80C.progress >= 100 ? THEME.sage : taxData80C.progress >= 60 ? THEME.gold : THEME.accent, borderRadius: 4, transition: "width 1s ease" }} />
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { label: "ELSS Invested", value: taxData80C.elss, color: "#6366f1" },
                { label: "PPF Contribution", value: taxData80C.ppfAnnual, color: THEME.sage },
                { label: "LIC Premium", value: taxData80C.licPremium, color: THEME.gold },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                    <span style={{ color: THEME.muted, fontWeight: 500 }}>{label}</span>
                  </div>
                  <span style={{ fontWeight: 700 }}>{fmtINRFull(value)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${THEME.line}`, fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>Remaining Space</span>
                <span style={{ fontWeight: 800, color: taxData80C.remaining > 0 ? THEME.rust : THEME.sage }}>{fmtINRFull(taxData80C.remaining)}</span>
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>
            {/* Savings Goal & Pacing */}
            <Card style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Savings Goal & Pacing</span>
                {editingTarget ? (
                  <input
                    type="number"
                    autoFocus
                    defaultValue={state.profile.savingsTarget || 20}
                    onBlur={(e) => {
                      const val = e.target.value;
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 0 && num <= 100) {
                        setState((prev: any) => ({
                          ...prev,
                          profile: { ...prev.profile, savingsTarget: num }
                        }));
                      }
                      setEditingTarget(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setEditingTarget(false);
                    }}
                    style={{
                      width: 60,
                      background: 'rgba(52, 211, 153, 0.1)',
                      border: `1px solid ${THEME.sage}`,
                      borderRadius: 6,
                      color: THEME.sage,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '2px 6px',
                      outline: 'none',
                      textAlign: 'center'
                    }}
                  />
                ) : (
                  <Badge
                    variant="sage"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTarget(true);
                    }}
                  >
                    Target: {state.profile.savingsTarget || 20}%
                  </Badge>
                )}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
                {(() => {
                  const income = metrics.monthIncome || 0;
                  const spent = metrics.monthExpense || 0;
                  const targetPct = state.profile.savingsTarget || 20;
                  const savingsTarget = income * (targetPct / 100);
                  const safeSpendLimit = income * ((100 - targetPct) / 100);
                  const remainingSafe = safeSpendLimit - spent;
                  const spendingPct = income > 0 ? (spent / income) * 100 : 0;
                  const isOverBudget = spent > safeSpendLimit;

                  // Calculate remaining days in month for daily actionable
                  const now = new Date();
                  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                  const daysLeft = Math.max(1, lastDay - now.getDate());
                  const dailyBudget = remainingSafe > 0 ? (remainingSafe / daysLeft) : 0;

                  return (
                    <>
                      <div style={{ textAlign: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                          {remainingSafe > 0 ? "Safe to Spend" : "Savings Alert"}
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: remainingSafe > 0 ? THEME.sage : THEME.rust, letterSpacing: '-0.03em' }}>
                          {fmtINRFull(Math.abs(remainingSafe))}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                          {remainingSafe > 0
                            ? `Keep daily spend below ${fmtINR(dailyBudget)} to hit your ${targetPct}% goal`
                            : `You've exceeded your safety limit by ${fmtINR(Math.abs(remainingSafe))}`}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 10, padding: '12px 0', borderTop: `1px solid ${THEME.line}`, borderBottom: `1px solid ${THEME.line}` }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>Income</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(income)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>Spent</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(spent)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>To Save</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>{fmtINRFull(savingsTarget)}</div>
                        </div>
                      </div>

                      <div style={{ position: 'relative', height: 12, background: THEME.line, borderRadius: 6, overflow: 'hidden' }}>
                        {/* Safe Zone Marker */}
                        <div style={{
                          position: 'absolute',
                          left: `${100 - targetPct}%`,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: THEME.accent,
                          zIndex: 2,
                          opacity: 0.5
                        }} />

                        {/* Actual Spending Fill */}
                        <div style={{
                          width: `${Math.min(100, spendingPct)}%`,
                          height: '100%',
                          background: isOverBudget ? THEME.rust : spendingPct > 95 ? "#F97316" : spendingPct > (100 - targetPct) * 0.8 ? THEME.gold : spendingPct > 50 ? "#A3E635" : THEME.sage,
                          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                        <span>SPENT: {spendingPct.toFixed(0)}%</span>
                        <span>GOAL: {targetPct}% SAVED</span>
                      </div>

                      <div style={{
                        padding: '12px',
                        borderRadius: 12,
                        background: isOverBudget ? 'rgba(248, 113, 113, 0.05)' : 'rgba(52, 211, 153, 0.05)',
                        border: `1px solid ${isOverBudget ? 'rgba(248, 113, 113, 0.1)' : 'rgba(52, 211, 153, 0.1)'}`,
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: isOverBudget ? THEME.rust : THEME.sage,
                        fontWeight: 500
                      }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 2 }}>Goal Health Check</div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>Monthly savings pace vs what each goal needs</div>
                </div>
              </div>
              {goalHealth.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: THEME.muted, fontSize: 13 }}>Add goals in the Goals tab to see your progress and pacing here</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {goalHealth.map((g: any) => (
                    <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(128,128,128,0.04)", border: `1px solid ${g.achieved ? "rgba(52,211,153,0.2)" : g.onTrack ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.2)"}` }}>
                      {g.achieved || g.onTrack
                        ? <CheckCircle2 size={18} color={THEME.sage} style={{ flexShrink: 0 }} />
                        : <XCircle size={18} color={THEME.rust} style={{ flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{g.name || g.title}</span>
                          <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                            {g.achieved ? "✓ Achieved" : g.monthsLeft > 0 ? `${g.monthsLeft}mo left` : g.targetDate ? "Overdue" : "No deadline"}
                          </span>
                        </div>
                        <div style={{ height: 6, background: THEME.line, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                          <div style={{ height: "100%", width: g.progress + "%", background: g.achieved ? THEME.sage : g.onTrack ? THEME.accent : THEME.gold, borderRadius: 3, transition: "width 1s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, flexWrap: "wrap", gap: 4 }}>
                          <span>{fmtINRFull(g.savedAmount)} of {fmtINRFull(g.targetAmount)}</span>
                          {!g.achieved && g.monthsLeft > 0 && (
                            <span style={{ color: g.onTrack ? THEME.sage : THEME.rust, fontWeight: 700 }}>
                              Need {fmtINR(g.monthlyNeeded)}/mo · {g.onTrack ? "On track ✓" : "Behind ✗"}
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
            const fyEndYear = todayD.getMonth() >= 3 ? todayD.getFullYear() + 1 : todayD.getFullYear();
            const fyEnd = new Date(fyEndYear, 2, 31);
            const daysToFYEnd = Math.ceil((fyEnd.getTime() - todayMs) / 86400000);
            const isNearFYEnd = daysToFYEnd >= 0 && daysToFYEnd <= 60;

            const losingStocks = (state.stocks || []).reduce((acc: any[], s: any) => {
              const base = (s.symbol || "").replace(/\.NS$|\.BO$/, "").replace(/-EQ$/, "").toUpperCase();
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
              const daysHeld = buyDate ? Math.floor((todayMs - buyDate.getTime()) / 86400000) : null;
              const isSTCG = daysHeld === null || daysHeld < 365;
              acc.push({ name: base, type: "Stock", loss, lossPct, isSTCG });
              return acc;
            }, []);

            const losingMFs = (state.mutualFunds || []).reduce((acc: any[], m: any) => {
              const currentNav = Number(m.currentNav || 0);
              const buyNav = Number(m.buyNav || 0) || (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
              if (!currentNav || !buyNav || currentNav >= buyNav) return acc;
              const units = Number(m.units || 0);
              const loss = (buyNav - currentNav) * units;
              const lossPct = ((buyNav - currentNav) / buyNav) * 100;
              const buyDate = m.buyDate ? new Date(m.buyDate) : null;
              const daysHeld = buyDate ? Math.floor((todayMs - buyDate.getTime()) / 86400000) : null;
              const isSTCG = daysHeld === null || daysHeld < 365;
              const name = (m.scheme || m.fund || "Mutual Fund").substring(0, 28);
              acc.push({ name, type: "MF", loss, lossPct, isSTCG });
              return acc;
            }, []);

            const allLosses = [...losingStocks, ...losingMFs].sort((a, b) => b.loss - a.loss);
            const totalLoss = allLosses.reduce((s, x) => s + x.loss, 0);
            const stcgLoss = allLosses.filter(x => x.isSTCG).reduce((s, x) => s + x.loss, 0);
            const ltcgLoss = allLosses.filter(x => !x.isSTCG).reduce((s, x) => s + x.loss, 0);
            const estimatedTaxSaving = stcgLoss * 0.20 + ltcgLoss * 0.125;

            return (
              <Card style={{ padding: 24, marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div className="section-label" style={{ marginBottom: 2 }}>Tax Loss Harvesting</div>
                    <div style={{ fontSize: 12, color: THEME.muted }}>Holdings in loss that can be sold to offset capital gains</div>
                  </div>
                  {isNearFYEnd && (
                    <Badge variant="rust" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={10} />
                      {daysToFYEnd}d to Mar 31
                    </Badge>
                  )}
                </div>

                {allLosses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: THEME.muted, fontSize: 13, background: "rgba(52,211,153,0.03)", borderRadius: 12 }}>
                    All holdings currently in profit — no harvesting opportunities
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: 16, background: "rgba(239,68,68,0.04)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.1)", marginBottom: 20 }}>
                      {[
                        { label: "Harvestable Loss", value: fmtINR(totalLoss), color: THEME.rust },
                        { label: "Est. Tax Saving", value: fmtINR(estimatedTaxSaving), color: THEME.sage },
                        { label: "Positions", value: String(allLosses.length), color: THEME.ink },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: "-0.02em" }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      {allLosses.slice(0, 6).map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {item.type === "Stock"
                              ? <TrendingUp size={16} color={THEME.rust} />
                              : <Activity size={16} color={THEME.rust} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.name}</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust, flexShrink: 0, marginLeft: 8 }}>−{fmtINR(item.loss)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 11, color: THEME.muted }}>
                              <span>{item.type} · {item.isSTCG ? "STCG 20%" : "LTCG 12.5%"}</span>
                              <span style={{ color: THEME.rust, fontWeight: 600 }}>↓ {item.lossPct.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {allLosses.length > 6 && (
                      <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: THEME.muted }}>
                        +{allLosses.length - 6} more positions in loss
                      </div>
                    )}

                    <div style={{ marginTop: 14, fontSize: 11, color: THEME.muted, lineHeight: 1.6 }}>
                      * STCG 20% · LTCG 12.5% (Budget 2024 rates). Selling realises the loss to offset gains. Re-buy after 30+ days to avoid wash-sale issues. Consult your CA.
                    </div>
                  </>
                )}
              </Card>
            );
          })()}
        </div>
      )}

      {/* ────────────────── SUB-TAB: SPENDING ────────────────── */}
      {sub === "spending" && (
        <div className="animate-fade-in-up">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
            <Card style={{ padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div className="section-label" style={{ marginBottom: 2 }}>Expense Breakup (This Month)</div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    {selectedExpenseCategory ? `Drill down: ${selectedExpenseCategory}` : "Interactive monthly spending map"}
                  </div>
                </div>
                {selectedExpenseCategory && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedExpenseCategory(null); setActiveExpenseIndex(null); }} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px" }}>
                    <ChevronLeft size={14} /> Back
                  </Button>
                )}
              </div>
              {metrics.expenseBreakdown?.length === 0 ? (
                <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12, textAlign: "center", padding: 24 }}>
                  No expenses recorded this month. Add debit transactions to see your spending breakup.
                </div>
              ) : (
                <div className="allocation-interactive-container" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 24, minHeight: 300 }}>
                  {/* Left Side: Donut Chart with central display */}
                  <div style={{ flex: "1 1 240px", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={metrics.expenseBreakdown}
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
                            const selectedName = metrics.expenseBreakdown[index]?.name;
                            setSelectedExpenseCategory(selectedName === selectedExpenseCategory ? null : selectedName);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {metrics.expenseBreakdown.map((item: any, i: number) => {
                            const isSelected = selectedExpenseCategory === item.name;
                            const isHovered = activeExpenseIndex === i;
                            return (
                              <Cell 
                                key={i} 
                                fill={PIE_COLORS[i % PIE_COLORS.length]} 
                                opacity={selectedExpenseCategory ? (isSelected ? 1 : 0.4) : (activeExpenseIndex !== null ? (isHovered ? 1 : 0.6) : 1)}
                                style={{
                                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  transform: isHovered || isSelected ? "scale(1.03)" : "scale(1)",
                                  transformOrigin: "center"
                                }}
                              />
                            );
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Central display inside the donut hole */}
                    <div style={{
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
                      zIndex: 2
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                        {activeExpenseIndex !== null ? metrics.expenseBreakdown[activeExpenseIndex]?.name : (selectedExpenseCategory ? selectedExpenseCategory : "Total Spend")}
                      </span>
                      <span style={{ fontSize: 17, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                        {fmtINRFull(
                          activeExpenseIndex !== null 
                            ? metrics.expenseBreakdown[activeExpenseIndex]?.value 
                            : (selectedExpenseCategory 
                                ? (metrics.expenseBreakdown.find(x => x.name === selectedExpenseCategory)?.value || 0) 
                                : metrics.monthExpense)
                        )}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, marginTop: 2 }}>
                        {(() => {
                          const val = activeExpenseIndex !== null 
                            ? metrics.expenseBreakdown[activeExpenseIndex]?.value 
                            : (selectedExpenseCategory 
                                ? (metrics.expenseBreakdown.find(x => x.name === selectedExpenseCategory)?.value || 0) 
                                : metrics.monthExpense);
                          const total = metrics.monthExpense || 1;
                          return `${((val / total) * 100).toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Interactive detail list and sub-asset drill-down */}
                  <div style={{ flex: "1 1 240px", maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
                    {selectedExpenseCategory ? (
                      // DRILL DOWN TRANSACTION LIST FOR SELECTED CATEGORY
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${THEME.line}`, paddingBottom: 6 }}>
                          <span>Transaction Details</span>
                          <span>Amount</span>
                        </div>
                        {(() => {
                          const subList = getExpenseAssets(selectedExpenseCategory);
                          if (subList.length === 0) {
                            return <div style={{ fontSize: 12, color: THEME.muted, padding: "12px 0", textAlign: "center" }}>No transactions this month</div>;
                          }
                          return subList.map((item: any, idx: number) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                              <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                                {item.sub && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{item.sub}</div>}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{fmtINR(item.value)}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      // OVERALL EXPENSE CATEGORY ALLOCATION LIST
                      <div style={{ display: "grid", gap: 8 }}>
                        {metrics.expenseBreakdown.map((item: any, i: number) => {
                          const isHovered = activeExpenseIndex === i;
                          const color = PIE_COLORS[i % PIE_COLORS.length];
                          const pct = ((item.value / (metrics.monthExpense || 1)) * 100).toFixed(1);
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
                                background: isHovered ? "rgba(128,128,128,0.05)" : "rgba(128,128,128,0.02)", 
                                border: isHovered ? `1px solid ${color}` : `1px solid ${THEME.line}`,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>{pct}%</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginLeft: 8 }}>{fmtINR(item.value)}</span>
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
              {metrics.expenseBreakdown?.length === 0 ? (
                <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.muted, fontSize: 13, background: "rgba(128,128,128,0.03)", borderRadius: 12, textAlign: "center", padding: 24 }}>
                  No spending details available
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  {metrics.expenseBreakdown.slice(0, 5).map((cat: any, i: number) => {
                    const maxVal = metrics.expenseBreakdown[0].value;
                    const pct = maxVal > 0 ? (cat.value / maxVal) * 100 : 0;
                    return (
                      <div key={cat.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{cat.name}</span>
                          <span style={{ fontSize: 14, fontWeight: 800 }}>{fmtINRFull(cat.value)}</span>
                        </div>
                        <div className="progress-track"><div className="progress-fill" style={{ width: pct + "%", background: PIE_COLORS[i % PIE_COLORS.length] }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ────────────────── SUB-TAB: CALENDAR ────────────────── */}
      {sub === "calendar" && (
        <div className="animate-fade-in-up">
          <Card style={{ padding: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>
                Bill Calendar · {calendarDate.toLocaleString("en-IN", { month: "long", year: "numeric" })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
                  }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, padding: 0 }}
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
                    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                  }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, padding: 0 }}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            {(() => {
              const now = new Date();
              const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              
              // Only highlight today if the viewed month and year match today's real date
              const today2 = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null;
              
              const dueDays: Record<number, any[]> = {};

              // 1. CREDIT CARDS: recurring or one-off dues (excluding closed cards)
              (state.creditCards || []).filter((c: any) => (c.status || "").toLowerCase() !== "closed").forEach((c: any) => {
                if (c.dueDate) {
                  const d = new Date(c.dueDate);
                  if (d.getFullYear() === year && d.getMonth() === month) {
                    dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({ label: c.issuer || "Card", color: THEME.rust });
                  }
                } else if (c.dueDay) {
                  const day = parseInt(c.dueDay, 10);
                  if (!isNaN(day) && day >= 1 && day <= 31) {
                    const targetDay = Math.min(day, daysInMonth);
                    dueDays[targetDay] = (dueDays[targetDay] || []).concat({ label: (c.issuer || "Card") + " Bill", color: THEME.rust });
                  }
                }
              });

              // 2. SUBSCRIPTIONS: recurrent logic by cycle
              (state.subscriptions || []).filter((s: any) => !s.paused).forEach((s: any) => {
                if (s.renewalDate) {
                  const subDate = new Date(s.renewalDate);
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
                    dueDays[targetDay] = (dueDays[targetDay] || []).concat({ label: s.name, color: THEME.gold });
                  }
                }
              });

              // 3. ADVANCE TAX (dynamic based on month number)
              [15].forEach((day) => { if (month === 5) dueDays[day] = (dueDays[day] || []).concat({ label: "Adv. Tax", color: THEME.accent }); });
              if (month === 8 || month === 11 || month === 2) dueDays[15] = (dueDays[15] || []).concat({ label: "Adv. Tax", color: THEME.accent });

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
                          if (year > matDate.getFullYear() || (year === matDate.getFullYear() && month > matDate.getMonth())) {
                            isMatured = true;
                          }
                        }
                      }
                      
                      if (!isMatured && month === commMonth) {
                        const dueDay = Math.min(commDate.getDate(), daysInMonth);
                        dueDays[dueDay] = (dueDays[dueDay] || []).concat({ label: `LIC: ${l.planName}`, color: THEME.sage });
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
                          if (year > expDate.getFullYear() || (year === expDate.getFullYear() && month > expDate.getMonth())) {
                            isExpired = true;
                          }
                        }
                      }
                      
                      // Also check if we have finished paying based on premium paying term
                      const payTerm = t.premiumPayingTerm ? parseInt(t.premiumPayingTerm, 10) : (t.term ? parseInt(t.term, 10) : null);
                      if (payTerm && !isNaN(payTerm)) {
                        const yearsElapsed = year - commYear;
                        if (yearsElapsed >= payTerm) {
                          isExpired = true; // Premium paying term ended
                        }
                      }
                      
                      if (!isExpired && month === commMonth) {
                        const dueDay = Math.min(commDate.getDate(), daysInMonth);
                        dueDays[dueDay] = (dueDays[dueDay] || []).concat({ label: `Term: ${t.planName || "Plan"}`, color: THEME.sage });
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
                          if (year > matDate.getFullYear() || (year === matDate.getFullYear() && month > matDate.getMonth())) {
                            isMatured = true;
                          }
                        }
                      }
                      
                      // Also check if we have finished paying based on premium paying term
                      const payTerm = ip.premiumPayingTerm ? parseInt(ip.premiumPayingTerm, 10) : (ip.policyTerm ? parseInt(ip.policyTerm, 10) : null);
                      if (payTerm && !isNaN(payTerm)) {
                        const yearsElapsed = year - commYear;
                        if (yearsElapsed >= payTerm) {
                          isMatured = true; // Premium paying term ended
                        }
                      }
                      
                      if (!isMatured && month === commMonth) {
                        const dueDay = Math.min(commDate.getDate(), daysInMonth);
                        dueDays[dueDay] = (dueDays[dueDay] || []).concat({ label: `Invest: ${ip.planName || "Plan"}`, color: THEME.sage });
                      }
                    }
                  }
                }
              });

              // 7. RENTED PROPERTIES: monthly rent due day within active agreement range (paid vs unpaid status coloring)
              (state.rentedProperties || []).filter((p: any) => p.isActive !== false && Number(p.monthlyRent) > 0).forEach((p: any) => {
                let isAgreementActive = true;
                if (p.agreementStart) {
                  const start = new Date(p.agreementStart);
                  if (!isNaN(start.getTime())) {
                    if (year < start.getFullYear() || (year === start.getFullYear() && month < start.getMonth())) {
                      isAgreementActive = false;
                    }
                  }
                }
                if (p.agreementEnd) {
                  const end = new Date(p.agreementEnd);
                  if (!isNaN(end.getTime())) {
                    if (year > end.getFullYear() || (year === end.getFullYear() && month > end.getMonth())) {
                      isAgreementActive = false;
                    }
                  }
                }

                if (isAgreementActive) {
                  const day = p.dueDay ? parseInt(p.dueDay, 10) : 5;
                  if (!isNaN(day) && day >= 1 && day <= 31) {
                    const targetDay = Math.min(day, daysInMonth);
                    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
                    const isPaid = (p.payments || []).some((pay: any) => pay.date && pay.date.startsWith(monthStr));
                    dueDays[targetDay] = (dueDays[targetDay] || []).concat({
                      label: `${p.propertyName || "Rent"}${isPaid ? " (Paid)" : " Rent"}`,
                      color: isPaid ? THEME.sage : THEME.gold,
                    });
                  }
                }
              });

              const cells: (number | null)[] = [];
              for (let i = 0; i < firstDay; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);

              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: THEME.muted, padding: "4px 0" }}>{d}</div>
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
                            background: (d && d === today2)
                              ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)`
                              : (d && dueDays[d])
                              ? "color-mix(in srgb, var(--t-gold) 6%, transparent)"
                              : "transparent",
                            border: (d && d === today2)
                              ? `1.5px solid ${THEME.accent}`
                              : (d && dueDays[d])
                              ? `1px dashed color-mix(in srgb, ${THEME.gold} 30%, transparent)`
                              : `1px solid ${THEME.line}`,
                            cursor: hasEvents ? "pointer" : "default",
                            transition: "all 0.18s ease-in-out",
                          }}
                          className={hasEvents ? "hover:scale-[1.03] hover:shadow-lg" : ""}
                        >
                          {d && (
                            <>
                              <div style={{ fontWeight: d === today2 ? 800 : 600, color: d === today2 ? THEME.accent : THEME.ink, marginBottom: 4 }}>
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
                                <div style={{ fontSize: 8, color: THEME.accent, fontWeight: 800, marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                                  <span>•</span> {dueDays[d].length - 2} more
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: THEME.muted, marginTop: 12 }}>
                    <span><span style={{ color: THEME.rust, fontWeight: 700 }}>●</span> Credit card dues</span>
                    <span><span style={{ color: THEME.gold, fontWeight: 700 }}>●</span> Subscriptions / Unpaid Rent</span>
                    <span><span style={{ color: THEME.accent, fontWeight: 700 }}>●</span> Advance tax</span>
                    <span><span style={{ color: THEME.sage, fontWeight: 700 }}>●</span> Insurance / Paid Rent</span>
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      )}

      {showReport && (
        <MonthlyReportModal metrics={metrics} state={state} selectedDate={calendarDate} onClose={() => setShowReport(false)} />
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
                    border: `1px solid color-mix(in srgb, ${evt.color} 18%, transparent)`,
                    borderLeft: `4px solid ${evt.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                      {evt.label}
                    </span>
                    <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                      Monthly Scheduled Due
                    </span>
                  </div>
                  <Badge
                    style={{
                      background: isPaid ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)` : `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
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
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
};

const HeroStat = ({ label, value, negative, sage }: any) => {
  const color = negative ? "#F87171" : sage ? "#34D399" : "rgba(255,255,255,0.9)";
  return (
    <div style={{ borderLeft: `2px solid ${color}22`, paddingLeft: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 5, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {fmtINRFull(value)}
      </div>
    </div>
  );
};
