/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  Filter,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldCheck,
  Award,
  ShoppingBag,
  Utensils,
  Plane,
  Car,
  Zap,
  Film,
  HeartPulse,
  Laptop,
  HelpCircle,
  Info,
  X,
  Clock,
  Receipt,
  Percent,
  Tag,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  Coins,
  Store,
  Compass,
  FileSpreadsheet,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact, fmtDate, today } from "../../utils/finance";
import { getCurrentFYStartYear, getCurrentFY } from "../../utils/appConstants";
import { useMasterData } from "../../utils/masterData";
import { BankLogo, CardNetworkLogo } from "../ui/BrandLogos";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { getNextFeeDate } from "../tabs/CreditTab";

export interface NormalizedCardTxn {
  id: string;
  date: string;
  amount: number;
  type: "charge" | "payment" | "load" | "refund" | "adjustment";
  merchant: string;
  category: string;
  cardType: "credit" | "prepaid";
  cardId: string;
  cardName: string;
  bank: string;
  network?: string;
  last4?: string;
  variantName?: string;
  fy: string; // e.g. "FY 2024-25"
  fyStartYear: number;
  ay: string; // e.g. "AY 2025-26"
  monthKey: string; // "2024-05"
  monthLabel: string; // "May 2024"
  monthShort: string; // "May"
  year: number;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
}

export const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const FY_MONTH_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2]; // Apr to Mar

export const getFYDetails = (dateStr: string) => {
  if (!dateStr) {
    const currentFYStart = getCurrentFYStartYear();
    return {
      fy: `FY ${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`,
      fyStartYear: currentFYStart,
      ay: `AY ${currentFYStart + 1}-${String(currentFYStart + 2).slice(-2)}`,
    };
  }
  try {
    const parts = dateStr.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const startYear = m >= 3 ? y : y - 1;
    const endYear = startYear + 1;
    return {
      fy: `FY ${startYear}-${String(endYear).slice(-2)}`,
      fyStartYear: startYear,
      ay: `AY ${endYear}-${String(endYear + 1).slice(-2)}`,
    };
  } catch {
    const currentFYStart = getCurrentFYStartYear();
    return {
      fy: `FY ${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`,
      fyStartYear: currentFYStart,
      ay: `AY ${currentFYStart + 1}-${String(currentFYStart + 2).slice(-2)}`,
    };
  }
};

export const getCategoryIcon = (cat: string) => {
  const c = (cat || "").toLowerCase();
  if (c.includes("food") || c.includes("dining") || c.includes("restaurant") || c.includes("swiggy") || c.includes("zomato")) return <Utensils size={15} />;
  if (c.includes("shop") || c.includes("apparel") || c.includes("clothes") || c.includes("amazon") || c.includes("flipkart")) return <ShoppingBag size={15} />;
  if (c.includes("travel") || c.includes("flight") || c.includes("hotel") || c.includes("makemytrip") || c.includes("stay")) return <Plane size={15} />;
  if (c.includes("fuel") || c.includes("transport") || c.includes("uber") || c.includes("ola") || c.includes("commute") || c.includes("petrol")) return <Car size={15} />;
  if (c.includes("util") || c.includes("bill") || c.includes("electricity") || c.includes("water") || c.includes("gas") || c.includes("mobile") || c.includes("wifi")) return <Zap size={15} />;
  if (c.includes("grocer") || c.includes("supermarket") || c.includes("zepto") || c.includes("blinkit") || c.includes("instamart") || c.includes("bigbasket")) return <Store size={15} />;
  if (c.includes("entertain") || c.includes("movie") || c.includes("netflix") || c.includes("spotify") || c.includes("prime") || c.includes("hotstar")) return <Film size={15} />;
  if (c.includes("medic") || c.includes("health") || c.includes("doctor") || c.includes("pharmacy") || c.includes("hospital")) return <HeartPulse size={15} />;
  if (c.includes("tech") || c.includes("electronic") || c.includes("gadget") || c.includes("apple") || c.includes("software")) return <Laptop size={15} />;
  if (c.includes("pay") || c.includes("settle") || c.includes("bill pay")) return <CheckCircle2 size={15} />;
  return <Tag size={15} />;
};

export const getCategoryColor = (cat: string) => {
  const c = (cat || "").toLowerCase();
  if (c.includes("food") || c.includes("dining") || c.includes("restaurant")) return "#F97316"; // orange
  if (c.includes("shop") || c.includes("apparel")) return "#8B5CF6"; // purple
  if (c.includes("travel") || c.includes("flight")) return "#0EA5E9"; // cyan/sky
  if (c.includes("fuel") || c.includes("transport")) return "#EAB308"; // yellow/amber
  if (c.includes("util") || c.includes("bill")) return "#06B6D4"; // teal
  if (c.includes("grocer") || c.includes("supermarket")) return "#10B981"; // emerald
  if (c.includes("entertain") || c.includes("movie")) return "#EC4899"; // pink
  if (c.includes("medic") || c.includes("health")) return "#EF4444"; // red
  if (c.includes("tech") || c.includes("electronic")) return "#3B82F6"; // blue
  if (c.includes("pay") || c.includes("settle")) return "#14B8A6"; // teal/green
  return THEME.accent || "#6366F1";
};

export const getCardDisplayName = (c: any): string => {
  if (c.issuer && c.issuer.trim()) return c.issuer.trim();
  if (c.cardName && c.cardName.trim()) return c.cardName.trim();
  if (c.name && c.name.trim()) return c.name.trim();
  if (c.bank && c.bank.trim()) return `${c.bank.trim()} Card`;
  return "Credit Card";
};

export const getPrepaidDisplayName = (p: any): string => {
  if (p.issuer && p.issuer.trim()) return p.issuer.trim();
  if (p.cardName && p.cardName.trim()) return p.cardName.trim();
  if (p.name && p.name.trim()) return p.name.trim();
  if (p.bank && p.bank.trim()) return `${p.bank.trim()} Prepaid`;
  return "Prepaid Card";
};

export const getCardBankName = (c: any): string => {
  if (c.issuer && c.issuer.trim()) return c.issuer.trim();
  if (c.bankName && c.bankName.trim()) return c.bankName.trim();
  if (c.bank && c.bank.trim()) return c.bank.trim();
  if (c.cardName && c.cardName.trim()) return c.cardName.trim();
  if (c.name && c.name.trim()) return c.name.trim();
  return "Bank";
};

interface CardInsightsSectionProps {
  state: any;
  onNavigateTab?: (subTab: string) => void;
  onAddTransaction?: () => void;
}

export function CardInsightsSection({
  state,
  onNavigateTab,
}: CardInsightsSectionProps) {
  const { privacyMode } = usePrivacy();
  const creditCards = useMemo(() => state.creditCards || [], [state.creditCards]);
  const prepaidCards = useMemo(() => state.prepaidCards || [], [state.prepaidCards]);

  // View & Filter States
  const [activeView, setActiveView] = useState<
    "overview" | "monthly" | "categories" | "tax_fy" | "merchants" | "optimization" | "ledger"
  >("overview");
  const [cardFilter, setCardFilter] = useState<string>("all"); // "all", "cc_all", "prepaid_all", or specific card ID
  const [periodFilter, setPeriodFilter] = useState<string>("all"); // "all", "current_fy", "prev_fy", "fy_custom", "ay_custom", "last_30d", "last_3m", "last_6m", "last_12m", "this_month", "this_cy"
  const [selectedFY, setSelectedFY] = useState<string>("");
  const [selectedAY, setSelectedAY] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amt_desc" | "amt_asc">("date_desc");
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<string | null>(null);

  // Normalize all transactions across Credit Cards & Prepaid Cards
  const allNormalizedTransactions = useMemo(() => {
    const list: NormalizedCardTxn[] = [];

    // 1. Credit Card Transactions
    creditCards.forEach((c: any) => {
      const cardName = getCardDisplayName(c);
      const bank = getCardBankName(c);
      const txs = Array.isArray(c.transactions) ? c.transactions : [];

      if (txs.length === 0 && Number(c.outstanding) > 0) {
        const fyInfo = getFYDetails(today());
        list.push({
          id: `cc-ob-${c.id}`,
          date: today(),
          amount: Number(c.outstanding),
          type: "charge",
          merchant: "Opening Balance",
          category: "General",
          cardType: "credit",
          cardId: c.id,
          cardName,
          bank,
          network: c.network,
          last4: c.last4,
          variantName: "Primary",
          fy: fyInfo.fy,
          fyStartYear: fyInfo.fyStartYear,
          ay: fyInfo.ay,
          monthKey: today().slice(0, 7),
          monthLabel: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
          monthShort: MONTH_NAMES_SHORT[new Date().getMonth()],
          year: new Date().getFullYear(),
          dayOfWeek: new Date().getDay(),
        });
      }

      txs.forEach((t: any) => {
        const rawAmt = Number(t.amount || 0);
        const isCharge = rawAmt >= 0;
        const absAmt = Math.abs(rawAmt);
        const txDate = t.date || today();
        const fyInfo = getFYDetails(txDate);
        const dateObj = new Date(txDate);
        const mIdx = !isNaN(dateObj.getTime()) ? dateObj.getMonth() : new Date().getMonth();
        const yr = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : new Date().getFullYear();
        const dow = !isNaN(dateObj.getTime()) ? dateObj.getDay() : 0;
        const monthKey = txDate.slice(0, 7);
        const monthLabel = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
          : monthKey;

        list.push({
          id: t.id || `cctx-${c.id}-${Math.random()}`,
          date: txDate,
          amount: absAmt,
          type: isCharge ? "charge" : "payment",
          merchant: t.merchant || t.note || (isCharge ? "Card Charge" : "Card Payment"),
          category: t.category || (isCharge ? "General" : "Payment"),
          cardType: "credit",
          cardId: c.id,
          cardName,
          bank,
          network: c.network,
          last4: c.last4,
          variantName: t.variantName || "Primary",
          fy: fyInfo.fy,
          fyStartYear: fyInfo.fyStartYear,
          ay: fyInfo.ay,
          monthKey,
          monthLabel,
          monthShort: MONTH_NAMES_SHORT[mIdx] || "Jan",
          year: yr,
          dayOfWeek: dow,
        });
      });
    });

    // 2. Prepaid Card Transactions
    prepaidCards.forEach((p: any) => {
      const cardName = getPrepaidDisplayName(p);
      const bank = getCardBankName(p);
      const txs = Array.isArray(p.transactions) ? p.transactions : [];

      txs.forEach((t: any) => {
        const amt = Number(t.amount || 0);
        const tType = (t.type || "spend").toLowerCase();
        const txDate = t.date || today();
        const fyInfo = getFYDetails(txDate);
        const dateObj = new Date(txDate);
        const mIdx = !isNaN(dateObj.getTime()) ? dateObj.getMonth() : new Date().getMonth();
        const yr = !isNaN(dateObj.getTime()) ? dateObj.getFullYear() : new Date().getFullYear();
        const dow = !isNaN(dateObj.getTime()) ? dateObj.getDay() : 0;
        const monthKey = txDate.slice(0, 7);
        const monthLabel = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
          : monthKey;

        let normalizedType: "charge" | "payment" | "load" | "refund" = "charge";
        if (tType === "load") normalizedType = "load";
        else if (tType === "refund") normalizedType = "refund";
        else normalizedType = "charge";

        list.push({
          id: t.id || `ptx-${p.id}-${Math.random()}`,
          date: txDate,
          amount: Math.abs(amt),
          type: normalizedType,
          merchant: t.merchant || t.note || (normalizedType === "load" ? "Card Top-Up" : "Prepaid Spend"),
          category: t.category || (normalizedType === "load" ? "Top-Up" : "Food"),
          cardType: "prepaid",
          cardId: p.id,
          cardName,
          bank,
          network: p.network,
          last4: p.last4,
          variantName: "Prepaid",
          fy: fyInfo.fy,
          fyStartYear: fyInfo.fyStartYear,
          ay: fyInfo.ay,
          monthKey,
          monthLabel,
          monthShort: MONTH_NAMES_SHORT[mIdx] || "Jan",
          year: yr,
          dayOfWeek: dow,
        });
      });
    });

    return list;
  }, [creditCards, prepaidCards]);

  // Extract all unique FYs & AYs available in data
  const { availableFYs, availableAYs } = useMemo(() => {
    const fySet = new Set<string>();
    const aySet = new Set<string>();
    const currentFYStart = getCurrentFYStartYear();
    const curFY = `FY ${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`;
    const curAY = `AY ${currentFYStart + 1}-${String(currentFYStart + 2).slice(-2)}`;
    fySet.add(curFY);
    aySet.add(curAY);

    allNormalizedTransactions.forEach((t) => {
      if (t.fy) fySet.add(t.fy);
      if (t.ay) aySet.add(t.ay);
    });

    const sortedFYs = Array.from(fySet).sort().reverse();
    const sortedAYs = Array.from(aySet).sort().reverse();
    return { availableFYs: sortedFYs, availableAYs: sortedAYs };
  }, [allNormalizedTransactions]);

  // Extract all unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    allNormalizedTransactions.forEach((t) => {
      if (t.category && t.type === "charge") cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [allNormalizedTransactions]);

  // Set default selected FY if empty
  React.useEffect(() => {
    if (!selectedFY && availableFYs.length > 0) {
      setSelectedFY(availableFYs[0]);
    }
    if (!selectedAY && availableAYs.length > 0) {
      setSelectedAY(availableAYs[0]);
    }
  }, [availableFYs, availableAYs, selectedFY, selectedAY]);

  // Filter Transactions based on Card Filter, Period Filter, Category, and Search
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();
    const currentFYStart = getCurrentFYStartYear();
    const currentFY = `FY ${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`;
    const prevFY = `FY ${currentFYStart - 1}-${String(currentFYStart).slice(-2)}`;

    return allNormalizedTransactions.filter((t) => {
      // 1. Card Filter
      if (cardFilter === "cc_all" && t.cardType !== "credit") return false;
      if (cardFilter === "prepaid_all" && t.cardType !== "prepaid") return false;
      if (cardFilter !== "all" && cardFilter !== "cc_all" && cardFilter !== "prepaid_all" && t.cardId !== cardFilter) {
        return false;
      }

      // 2. Period Filter
      if (periodFilter === "current_fy" && t.fy !== currentFY) return false;
      if (periodFilter === "prev_fy" && t.fy !== prevFY) return false;
      if (periodFilter === "fy_custom" && selectedFY && t.fy !== selectedFY) return false;
      if (periodFilter === "ay_custom" && selectedAY && t.ay !== selectedAY) return false;

      const tDate = new Date(t.date);
      const tTime = tDate.getTime();
      const diffDays = (nowTime - tTime) / (1000 * 60 * 60 * 24);

      if (periodFilter === "last_30d" && (diffDays < 0 || diffDays > 30)) return false;
      if (periodFilter === "last_3m" && (diffDays < 0 || diffDays > 90)) return false;
      if (periodFilter === "last_6m" && (diffDays < 0 || diffDays > 180)) return false;
      if (periodFilter === "last_12m" && (diffDays < 0 || diffDays > 365)) return false;
      if (periodFilter === "this_month") {
        if (t.year !== now.getFullYear() || tDate.getMonth() !== now.getMonth()) return false;
      }
      if (periodFilter === "this_cy" && t.year !== now.getFullYear()) return false;

      // 3. Category Filter
      if (selectedCategory !== "all" && t.category !== selectedCategory) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          t.merchant.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.cardName.toLowerCase().includes(q) ||
          t.bank.toLowerCase().includes(q) ||
          (t.last4 && t.last4.includes(q)) ||
          String(t.amount).includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    allNormalizedTransactions,
    cardFilter,
    periodFilter,
    selectedFY,
    selectedAY,
    selectedCategory,
    searchQuery,
  ]);

  // Sort Transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "amt_desc") return b.amount - a.amount;
      if (sortBy === "amt_asc") return a.amount - b.amount;
      return 0;
    });
  }, [filteredTransactions, sortBy]);

  // Aggregate Metrics & Insights
  const metrics = useMemo(() => {
    let totalCharges = 0;
    let totalPayments = 0;
    let totalLoads = 0;
    let totalRefunds = 0;
    let chargeCount = 0;
    let paymentCount = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === "charge") {
        totalCharges += t.amount;
        chargeCount++;
      } else if (t.type === "payment") {
        totalPayments += t.amount;
        paymentCount++;
      } else if (t.type === "load") {
        totalLoads += t.amount;
      } else if (t.type === "refund") {
        totalRefunds += t.amount;
      }
    });

    const netSpend = totalCharges - totalRefunds;
    const avgSpendPerTxn = chargeCount > 0 ? totalCharges / chargeCount : 0;

    // Monthly aggregates for trend
    const monthMap: Record<
      string,
      {
        key: string;
        label: string;
        short: string;
        year: number;
        monthIdx: number;
        charges: number;
        payments: number;
        net: number;
        count: number;
        topCategory: string;
        catTotals: Record<string, number>;
      }
    > = {};

    filteredTransactions.forEach((t) => {
      if (!monthMap[t.monthKey]) {
        const d = new Date(t.date);
        monthMap[t.monthKey] = {
          key: t.monthKey,
          label: t.monthLabel,
          short: t.monthShort,
          year: t.year,
          monthIdx: !isNaN(d.getTime()) ? d.getMonth() : 0,
          charges: 0,
          payments: 0,
          net: 0,
          count: 0,
          topCategory: "General",
          catTotals: {},
        };
      }
      if (t.type === "charge") {
        monthMap[t.monthKey].charges += t.amount;
        monthMap[t.monthKey].count += 1;
        monthMap[t.monthKey].catTotals[t.category] =
          (monthMap[t.monthKey].catTotals[t.category] || 0) + t.amount;
      } else if (t.type === "payment") {
        monthMap[t.monthKey].payments += t.amount;
      }
    });

    // Compute top category per month
    Object.values(monthMap).forEach((m) => {
      m.net = m.charges - m.payments;
      let topCat = "General";
      let maxCatAmt = 0;
      Object.entries(m.catTotals).forEach(([cat, amt]) => {
        if (amt > maxCatAmt) {
          maxCatAmt = amt;
          topCat = cat;
        }
      });
      m.topCategory = topCat;
    });

    const sortedMonths = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));
    const activeMonthsCount = sortedMonths.length || 1;
    const monthlyAverageSpend = totalCharges / activeMonthsCount;

    // Peak spending month
    let peakMonth = sortedMonths.length > 0 ? sortedMonths[0] : null;
    sortedMonths.forEach((m) => {
      if (!peakMonth || m.charges > peakMonth.charges) peakMonth = m;
    });

    // Category breakdown
    const catMap: Record<
      string,
      { category: string; amount: number; count: number; cardBreakdown: Record<string, number> }
    > = {};
    filteredTransactions.forEach((t) => {
      if (t.type === "charge") {
        if (!catMap[t.category]) {
          catMap[t.category] = { category: t.category, amount: 0, count: 0, cardBreakdown: {} };
        }
        catMap[t.category].amount += t.amount;
        catMap[t.category].count += 1;
        catMap[t.category].cardBreakdown[t.cardName] =
          (catMap[t.category].cardBreakdown[t.cardName] || 0) + t.amount;
      }
    });

    const sortedCategories = Object.values(catMap).sort((a, b) => b.amount - a.amount);
    const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

    // Merchant breakdown
    const merchantMap: Record<
      string,
      { merchant: string; amount: number; count: number; topCat: string }
    > = {};
    filteredTransactions.forEach((t) => {
      if (t.type === "charge") {
        const mKey = t.merchant.trim() || "Unspecified";
        if (!merchantMap[mKey]) {
          merchantMap[mKey] = { merchant: mKey, amount: 0, count: 0, topCat: t.category };
        }
        merchantMap[mKey].amount += t.amount;
        merchantMap[mKey].count += 1;
      }
    });

    const sortedMerchants = Object.values(merchantMap).sort((a, b) => b.amount - a.amount);
    const topMerchant = sortedMerchants.length > 0 ? sortedMerchants[0] : null;

    // Day of week pattern
    const dayOfWeekSpends = [0, 0, 0, 0, 0, 0, 0]; // Sun (0) to Sat (6)
    filteredTransactions.forEach((t) => {
      if (t.type === "charge") {
        dayOfWeekSpends[t.dayOfWeek] = (dayOfWeekSpends[t.dayOfWeek] || 0) + t.amount;
      }
    });
    const weekendSpend = dayOfWeekSpends[0] + dayOfWeekSpends[6]; // Sun + Sat
    const weekdaySpend =
      dayOfWeekSpends[1] + dayOfWeekSpends[2] + dayOfWeekSpends[3] + dayOfWeekSpends[4] + dayOfWeekSpends[5];

    // Card-wise spend share
    const cardSpendMap: Record<
      string,
      {
        cardId: string;
        cardName: string;
        bank: string;
        cardType: "credit" | "prepaid";
        network?: string;
        last4?: string;
        charges: number;
        payments: number;
        count: number;
      }
    > = {};

    filteredTransactions.forEach((t) => {
      if (!cardSpendMap[t.cardId]) {
        cardSpendMap[t.cardId] = {
          cardId: t.cardId,
          cardName: t.cardName,
          bank: t.bank,
          cardType: t.cardType,
          network: t.network,
          last4: t.last4,
          charges: 0,
          payments: 0,
          count: 0,
        };
      }
      if (t.type === "charge") {
        cardSpendMap[t.cardId].charges += t.amount;
        cardSpendMap[t.cardId].count += 1;
      } else if (t.type === "payment" || t.type === "load") {
        cardSpendMap[t.cardId].payments += t.amount;
      }
    });

    const sortedCardSpends = Object.values(cardSpendMap).sort((a, b) => b.charges - a.charges);

    // Network share
    const networkMap: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      if (t.type === "charge") {
        const net = (t.network || "Other").toUpperCase();
        networkMap[net] = (networkMap[net] || 0) + t.amount;
      }
    });

    // FY-wise Spends breakdown
    const fyMap: Record<
      string,
      {
        fy: string;
        ay: string;
        startYear: number;
        charges: number;
        payments: number;
        count: number;
      }
    > = {};

    allNormalizedTransactions.forEach((t) => {
      if (!fyMap[t.fy]) {
        fyMap[t.fy] = {
          fy: t.fy,
          ay: t.ay,
          startYear: t.fyStartYear,
          charges: 0,
          payments: 0,
          count: 0,
        };
      }
      if (t.type === "charge") {
        fyMap[t.fy].charges += t.amount;
        fyMap[t.fy].count += 1;
      } else if (t.type === "payment") {
        fyMap[t.fy].payments += t.amount;
      }
    });

    const sortedFYBreakdown = Object.values(fyMap).sort((a, b) => b.startYear - a.startYear);

    // High value transactions (> ₹20,000)
    const highValueTxns = filteredTransactions
      .filter((t) => t.type === "charge" && t.amount >= 20000)
      .sort((a, b) => b.amount - a.amount);

    return {
      totalCharges,
      totalPayments,
      totalLoads,
      totalRefunds,
      netSpend,
      chargeCount,
      paymentCount,
      avgSpendPerTxn,
      monthlyAverageSpend,
      peakMonth,
      sortedMonths,
      sortedCategories,
      topCategory,
      sortedMerchants,
      topMerchant,
      dayOfWeekSpends,
      weekendSpend,
      weekdaySpend,
      sortedCardSpends,
      networkMap,
      sortedFYBreakdown,
      highValueTxns,
    };
  }, [filteredTransactions, allNormalizedTransactions]);

  // Overall Portfolio Limits & Health Metrics
  const portfolioSummary = useMemo(() => {
    const activeCC = creditCards.filter((c: any) => (c.status || "active").toLowerCase() !== "closed");
    const activePrepaid = prepaidCards.filter((p: any) => (p.status || "active").toLowerCase() !== "closed");

    // Pool group limits deduplication
    const groupPools: Record<string, number> = {};
    activeCC.forEach((c: any) => {
      if (c.sharedGroup) {
        groupPools[c.sharedGroup] = Math.max(
          groupPools[c.sharedGroup] || 0,
          Number(c.sharedGroupLimit) || 0
        );
      }
    });
    const totalLimit =
      activeCC
        .filter((c: any) => !c.sharedGroup)
        .reduce((acc: number, c: any) => acc + (Number(c.limit) || 0), 0) +
      (Object.values(groupPools) as number[]).reduce((acc: number, v: number) => acc + v, 0);

    const totalOutstanding = activeCC.reduce((acc: number, c: any) => acc + (Number(c.outstanding) || 0), 0);
    const totalAvailable = Math.max(0, totalLimit - totalOutstanding);
    const overallUtilPct = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 100) : 0;

    const totalPrepaidBalance = activePrepaid.reduce((acc: number, p: any) => acc + (Number(p.balance) || 0), 0);

    const totalRewardPoints = activeCC.reduce(
      (acc: number, c: any) => acc + (Number(c.rewardPointsBalance) || 0),
      0
    );
    const totalRewardValue = activeCC.reduce(
      (acc: number, c: any) =>
        acc + (Number(c.rewardPointsBalance) || 0) * (Number(c.rewardPointValue) || 0),
      0
    );

    const totalAnnualFees = activeCC
      .filter((c: any) => Number(c.annualFee) > 0)
      .reduce((acc: number, c: any) => acc + Number(c.annualFee), 0);

    // Billing Cycle Optimization: Best card to swipe today
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const rankedCardsForSwipe = activeCC.map((c: any) => {
      const cardName = getCardDisplayName(c);
      const bankName = getCardBankName(c);
      const billDateNum = Number(c.billDate || c.billingCycle || c.billingDay || 0);
      const dueDayNum = Number(c.dueDay || c.paymentDueDay || c.dueDate || 0);

      let daysUntilBill = 0;
      let interestFreeDays = 20; // fallback base grace period
      let nextBillDateStr = "Not configured";
      let nextDueDateStr = "Not configured";
      const hasBillDate = billDateNum >= 1 && billDateNum <= 31;
      const hasDueDay = dueDayNum >= 1 && dueDayNum <= 31;

      if (hasBillDate) {
        if (currentDay <= billDateNum) {
          daysUntilBill = billDateNum - currentDay;
        } else {
          daysUntilBill = (daysInCurrentMonth - currentDay) + billDateNum;
        }

        // Grace period between statement generation and payment due date
        let graceDays = 20;
        if (hasDueDay) {
          if (dueDayNum > billDateNum) {
            graceDays = dueDayNum - billDateNum;
          } else {
            graceDays = (30 - billDateNum) + dueDayNum;
          }
          if (graceDays < 10 || graceDays > 30) graceDays = 20;
        }

        interestFreeDays = daysUntilBill + graceDays;

        // Next bill date label
        const nextBillMonth = currentDay <= billDateNum ? currentMonth : (currentMonth + 1) % 12;
        nextBillDateStr = `${billDateNum} ${MONTH_NAMES_SHORT[nextBillMonth]}`;

        // Next due date label
        if (hasDueDay) {
          const nextDueMonth = (nextBillMonth + (dueDayNum > billDateNum ? 0 : 1)) % 12;
          nextDueDateStr = `${dueDayNum} ${MONTH_NAMES_SHORT[nextDueMonth]}`;
        }
      }

      const limit = Number(c.limit || 0);
      const outstanding = Number(c.outstanding || 0);
      const availableLimit = Math.max(0, limit - outstanding);
      const utilPct = limit > 0 ? Math.round((outstanding / limit) * 100) : 0;
      const feeDate = getNextFeeDate(c);

      const cardSpends = (c.transactions || [])
        .filter((t: any) => Number(t.amount) > 0)
        .reduce((s: number, t: any) => s + Number(t.amount), 0);

      const feeWaiverTarget = Number(c.feeWaiverSpendTarget || 0);
      const remainingWaiverSpend = feeWaiverTarget > 0 ? Math.max(0, feeWaiverTarget - cardSpends) : 0;

      return {
        ...c,
        cardName,
        bankName,
        billDateNum,
        dueDayNum,
        hasBillDate,
        hasDueDay,
        daysUntilBill,
        interestFreeDays,
        nextBillDateStr,
        nextDueDateStr,
        limit,
        outstanding,
        availableLimit,
        utilPct,
        feeDate,
        cardSpends,
        feeWaiverTarget,
        remainingWaiverSpend,
      };
    }).sort((a: any, b: any) => {
      // Sort by hasBillDate first, then maximum interestFreeDays, then available limit
      if (a.hasBillDate !== b.hasBillDate) {
        return a.hasBillDate ? -1 : 1;
      }
      if (b.interestFreeDays !== a.interestFreeDays) {
        return b.interestFreeDays - a.interestFreeDays;
      }
      return b.availableLimit - a.availableLimit;
    });

    return {
      activeCCCount: activeCC.length,
      activePrepaidCount: activePrepaid.length,
      totalLimit,
      totalOutstanding,
      totalAvailable,
      overallUtilPct,
      totalPrepaidBalance,
      totalRewardPoints,
      totalRewardValue,
      totalAnnualFees,
      rankedCardsForSwipe,
    };
  }, [creditCards, prepaidCards]);

  // Current FY SFT 285BA Tax Compliance Status (Limit ₹10,00,000 for credit cards in a financial year)
  const sftCompliance = useMemo(() => {
    const currentFYStart = getCurrentFYStartYear();
    const curFY = `FY ${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`;
    const targetFY = periodFilter === "fy_custom" && selectedFY ? selectedFY : curFY;

    const fyTxns = allNormalizedTransactions.filter(
      (t) => t.fy === targetFY && t.cardType === "credit"
    );

    const totalCCChargesInFY = fyTxns
      .filter((t) => t.type === "charge")
      .reduce((s, t) => s + t.amount, 0);

    const totalCCPaymentsInFY = fyTxns
      .filter((t) => t.type === "payment")
      .reduce((s, t) => s + t.amount, 0);

    const sftThreshold = 1000000; // ₹10,00,000 as per Section 285BA / Rule 114E
    const sftPct = Math.min(100, Math.round((totalCCChargesInFY / sftThreshold) * 100));
    const isExceeded = totalCCChargesInFY >= sftThreshold;
    const isWarning = totalCCChargesInFY >= 700000 && !isExceeded;

    return {
      targetFY,
      totalCCChargesInFY,
      totalCCPaymentsInFY,
      sftThreshold,
      sftPct,
      isExceeded,
      isWarning,
      remainingSafeLimit: Math.max(0, sftThreshold - totalCCChargesInFY),
    };
  }, [allNormalizedTransactions, periodFilter, selectedFY]);

  // Export Insights to CSV
  const exportInsightsCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      "Date",
      "Type",
      "Merchant/Note",
      "Category",
      "Amount",
      "Card Name",
      "Card Type",
      "Bank",
      "Network",
      "Variant",
      "Financial Year (FY)",
      "Assessment Year (AY)",
    ];
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.type.toUpperCase(),
      `"${(t.merchant || "").replace(/"/g, '""')}"`,
      `"${(t.category || "").replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.cardName || "").replace(/"/g, '""')}"`,
      t.cardType,
      `"${(t.bank || "").replace(/"/g, '""')}"`,
      t.network || "",
      `"${(t.variantName || "").replace(/"/g, '""')}"`,
      t.fy,
      t.ay,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `card_insights_${periodFilter}_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. Header Banner & View Pills */}
      <div
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 12%, var(--t-surface)) 0%, color-mix(in srgb, var(--t-card) 95%, transparent) 100%)",
          border: "1px solid color-mix(in srgb, var(--t-accent) 25%, var(--t-border))",
          borderRadius: 16,
          padding: "20px 24px",
          boxShadow: "0 4px 20px -2px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--t-accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px color-mix(in srgb, var(--t-accent) 40%, transparent)",
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: THEME.ink,
                  }}
                >
                  Card Spends & Portfolio Insights
                </h2>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
                  Comprehensive multi-card analytics, month-by-month & category breakdowns, FY/AY tax compliance, and reward optimization.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {onNavigateTab && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<CreditCard size={14} />}
                  onClick={() => onNavigateTab("cc")}
                >
                  Credit Cards ({creditCards.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Wallet size={14} />}
                  onClick={() => onNavigateTab("prepaid")}
                >
                  Prepaid Cards ({prepaidCards.length})
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={exportInsightsCSV}
              disabled={filteredTransactions.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 18,
            overflowX: "auto",
            paddingBottom: 4,
            borderBottom: "1px solid color-mix(in srgb, var(--t-line) 80%, transparent)",
          }}
        >
          {[
            { id: "overview", label: "Executive Summary", icon: <Layers size={14} /> },
            { id: "monthly", label: "Month-Wise Breakdown", icon: <Calendar size={14} /> },
            { id: "categories", label: "Category Intelligence", icon: <Tag size={14} /> },
            { id: "tax_fy", label: "F.Y. & A.Y. Tax Hub", icon: <Receipt size={14} /> },
            { id: "merchants", label: "Merchants & Networks", icon: <Store size={14} /> },
            { id: "optimization", label: "Smart Advisory & Benefits", icon: <Flame size={14} /> },
            { id: "ledger", label: "Unified Ledger", icon: <FileSpreadsheet size={14} /> },
          ].map((v) => {
            const isSelected = activeView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  border: isSelected ? "1px solid var(--t-accent)" : "1px solid transparent",
                  background: isSelected
                    ? "var(--t-accent)"
                    : "color-mix(in srgb, var(--t-surface) 60%, transparent)",
                  color: isSelected ? "#ffffff" : THEME.muted,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {v.icon}
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Global Filter & Scope Toolbar */}
      <Card
        style={{
          padding: "14px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          background: "var(--t-card)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1 }}>
          {/* Card Scope Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, textTransform: "uppercase" }}>
              Card:
            </span>
            <select
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid var(--t-line)",
                background: "var(--t-input-bg, var(--t-surface))",
                color: THEME.ink,
                outline: "none",
                cursor: "pointer",
                maxWidth: 210,
              }}
            >
              <option value="all">All Cards ({creditCards.length + prepaidCards.length})</option>
              <option value="cc_all">All Credit Cards ({creditCards.length})</option>
              <option value="prepaid_all">All Prepaid Cards ({prepaidCards.length})</option>
              <optgroup label="Credit Cards">
                {creditCards.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {getCardDisplayName(c)} {c.last4 ? `(••• ${c.last4})` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Prepaid Cards">
                {prepaidCards.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {getPrepaidDisplayName(p)} {p.last4 ? `(••• ${p.last4})` : ""}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Time Horizon Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, textTransform: "uppercase" }}>
              Period:
            </span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid var(--t-line)",
                background: "var(--t-input-bg, var(--t-surface))",
                color: THEME.ink,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Time</option>
              <option value="current_fy">Current F.Y. ({availableFYs[0] || "FY 2024-25"})</option>
              <option value="prev_fy">Previous F.Y.</option>
              <option value="fy_custom">Select F.Y. (Financial Year)</option>
              <option value="ay_custom">Select A.Y. (Assessment Year)</option>
              <option value="this_month">This Month</option>
              <option value="last_30d">Last 30 Days</option>
              <option value="last_3m">Last 3 Months</option>
              <option value="last_6m">Last 6 Months</option>
              <option value="last_12m">Last 12 Months</option>
              <option value="this_cy">Current Calendar Year</option>
            </select>
          </div>

          {/* Specific FY Selector */}
          {periodFilter === "fy_custom" && (
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--t-accent)",
                background: "color-mix(in srgb, var(--t-accent) 8%, var(--t-surface))",
                color: "var(--t-accent)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {availableFYs.map((fy) => (
                <option key={fy} value={fy}>
                  {fy} (Apr {fy.split(" ")[1]?.split("-")[0]} - Mar {Number(fy.split(" ")[1]?.split("-")[0]) + 1})
                </option>
              ))}
            </select>
          )}

          {/* Specific AY Selector */}
          {periodFilter === "ay_custom" && (
            <select
              value={selectedAY}
              onChange={(e) => setSelectedAY(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--t-accent)",
                background: "color-mix(in srgb, var(--t-accent) 8%, var(--t-surface))",
                color: "var(--t-accent)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {availableAYs.map((ay) => (
                <option key={ay} value={ay}>
                  {ay} (Relates to FY {Number(ay.split(" ")[1]?.split("-")[0]) - 1}-{String(Number(ay.split(" ")[1]?.split("-")[0])).slice(-2)})
                </option>
              ))}
            </select>
          )}

          {/* Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, textTransform: "uppercase" }}>
              Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid var(--t-line)",
                background: "var(--t-input-bg, var(--t-surface))",
                color: THEME.ink,
                outline: "none",
                cursor: "pointer",
                maxWidth: 170,
              }}
            >
              <option value="all">All Categories ({allCategories.length})</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: "relative", width: 220 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: THEME.muted,
            }}
          />
          <input
            type="text"
            placeholder="Search merchant/note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 30px",
              borderRadius: 8,
              fontSize: 12.5,
              border: "1px solid var(--t-line)",
              background: "var(--t-input-bg, var(--t-surface))",
              color: THEME.ink,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: THEME.muted,
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </Card>

      {/* 3. High-Level KPI Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Card Spends"
          value={fmtINRFull(metrics.totalCharges)}
          numericValue={metrics.totalCharges}
          formatValue={fmtINRFull}
          icon={<CreditCard />}
          color={THEME.rust}
          sub={`${metrics.chargeCount} transactions · Avg ${privacyMode ? "••••" : fmtINR(metrics.avgSpendPerTxn)}/swipe`}
        />

        <StatCard
          label="Payments & Top-Ups"
          value={fmtINRFull(metrics.totalPayments + metrics.totalLoads)}
          numericValue={metrics.totalPayments + metrics.totalLoads}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color={THEME.sage}
          sub={`${metrics.paymentCount} settlements logged`}
        />

        <StatCard
          label="Monthly Average Outflow"
          value={fmtINRFull(Math.round(metrics.monthlyAverageSpend))}
          numericValue={Math.round(metrics.monthlyAverageSpend)}
          formatValue={fmtINRFull}
          icon={<Calendar />}
          color={THEME.accent}
          sub={`Across ${metrics.sortedMonths.length || 1} active month${metrics.sortedMonths.length !== 1 ? "s" : ""}`}
        />

        <StatCard
          label="Credit Utilization"
          value={`${portfolioSummary.overallUtilPct}%`}
          icon={<ShieldCheck />}
          color={
            portfolioSummary.overallUtilPct > 70
              ? THEME.rust
              : portfolioSummary.overallUtilPct > 30
              ? THEME.gold
              : THEME.sage
          }
          sub={`${fmtINR(portfolioSummary.totalOutstanding)} of ${fmtINR(portfolioSummary.totalLimit)} used`}
        />

        {portfolioSummary.totalRewardPoints > 0 && (
          <StatCard
            label="Rewards Portfolio"
            value={Math.round(portfolioSummary.totalRewardPoints).toLocaleString("en-IN")}
            icon={<Award />}
            color={THEME.gold}
            sub={
              portfolioSummary.totalRewardValue > 0
                ? `≈ ${privacyMode ? "••••" : fmtINRFull(portfolioSummary.totalRewardValue)} cash value`
                : "Points accrued across cards"
            }
          />
        )}
      </div>

      {/* 4. Active SFT Tax Advisory Banner */}
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 12,
          fontSize: 13,
          background: sftCompliance.isExceeded
            ? "color-mix(in srgb, var(--t-rust) 8%, var(--t-surface))"
            : sftCompliance.isWarning
            ? "color-mix(in srgb, var(--t-gold) 8%, var(--t-surface))"
            : "color-mix(in srgb, var(--t-accent) 6%, var(--t-surface))",
          border: `1px solid ${
            sftCompliance.isExceeded
              ? "color-mix(in srgb, var(--t-rust) 25%, transparent)"
              : sftCompliance.isWarning
              ? "color-mix(in srgb, var(--t-gold) 25%, transparent)"
              : "color-mix(in srgb, var(--t-accent) 20%, transparent)"
          }`,
          borderLeft: `5px solid ${
            sftCompliance.isExceeded ? THEME.rust : sftCompliance.isWarning ? THEME.gold : THEME.accent
          }`,
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
        }}
      >
        <Receipt
          size={20}
          color={sftCompliance.isExceeded ? THEME.rust : sftCompliance.isWarning ? THEME.gold : THEME.accent}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontWeight: 700, color: THEME.ink }}>
              Section 285BA / SFT Compliance Monitor ({sftCompliance.targetFY})
            </div>
            <Badge
              variant={sftCompliance.isExceeded ? "danger" : sftCompliance.isWarning ? "warning" : "accent"}
            >
              {sftCompliance.sftPct}% of ₹10L Threshold
            </Badge>
          </div>
          <div style={{ color: THEME.muted, fontSize: 12.5, marginTop: 4, lineHeight: 1.45 }}>
            Under Indian Income Tax rules (Rule 114E), banks report credit card transactions to the Tax Department if annual card spends/payments aggregate to <strong>₹10,00,000 or more</strong> in a Financial Year.
            {sftCompliance.isExceeded ? (
              <span style={{ color: THEME.rust, fontWeight: 600 }}>
                {" "}Your total card spends in {sftCompliance.targetFY} are <Prv>{fmtINRFull(sftCompliance.totalCCChargesInFY)}</Prv>, which exceeds the SFT reporting limit. Keep invoice receipts and source-of-fund records handy for ITR filing.
              </span>
            ) : (
              <span>
                {" "}Current spends in {sftCompliance.targetFY}: <Prv><strong style={{ color: THEME.ink }}>{fmtINRFull(sftCompliance.totalCCChargesInFY)}</strong></Prv> (Safe limit remaining: <Prv><strong>{fmtINRFull(sftCompliance.remainingSafeLimit)}</strong></Prv>).
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: 6,
              background: "var(--t-line)",
              borderRadius: 3,
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${sftCompliance.sftPct}%`,
                background: sftCompliance.isExceeded ? THEME.rust : sftCompliance.isWarning ? THEME.gold : THEME.accent,
                borderRadius: 3,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* 5. Deep-Dive Section Views */}

      {/* VIEW 1: EXECUTIVE SUMMARY */}
      {activeView === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Month Trend & Category Distribution Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            {/* Monthly Trend Mini Visual */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={16} color={THEME.accent} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                    Monthly Spends Trend
                  </span>
                </div>
                <button
                  onClick={() => setActiveView("monthly")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--t-accent)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  Deep Dive <ChevronRight size={14} />
                </button>
              </div>

              {metrics.sortedMonths.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No transaction data logged for the selected period.
                </div>
              ) : (
                <div>
                  {/* Visual Bar Chart */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      height: 140,
                      paddingTop: 10,
                      paddingBottom: 6,
                      borderBottom: "1px solid var(--t-line)",
                    }}
                  >
                    {metrics.sortedMonths.slice(-8).map((m) => {
                      const maxMonthCharge = Math.max(...metrics.sortedMonths.map((x) => x.charges), 1);
                      const heightPct = Math.max(8, Math.round((m.charges / maxMonthCharge) * 100));
                      const isPeak = metrics.peakMonth?.key === m.key;
                      return (
                        <div
                          key={m.key}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            height: "100%",
                            justifyContent: "flex-end",
                            gap: 4,
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 600, color: THEME.muted }}>
                            <Prv>{fmtINR(m.charges)}</Prv>
                          </div>
                          <div
                            title={`${m.label}: ${fmtINRFull(m.charges)} (${m.count} txns)`}
                            style={{
                              width: "100%",
                              height: `${heightPct}%`,
                              background: isPeak
                                ? "linear-gradient(180deg, var(--t-rust) 0%, color-mix(in srgb, var(--t-rust) 70%, transparent) 100%)"
                                : "linear-gradient(180deg, var(--t-accent) 0%, color-mix(in srgb, var(--t-accent) 60%, transparent) 100%)",
                              borderRadius: "6px 6px 0 0",
                              transition: "height 0.3s ease",
                              cursor: "pointer",
                            }}
                          />
                          <div style={{ fontSize: 11, fontWeight: 600, color: isPeak ? THEME.rust : THEME.ink, marginTop: 4 }}>
                            {m.short}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {metrics.peakMonth && (
                    <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted, display: "flex", justifyContent: "space-between" }}>
                      <span>
                        Highest spend month: <strong>{metrics.peakMonth.label}</strong> (<Prv>{fmtINRFull(metrics.peakMonth.charges)}</Prv>)
                      </span>
                      <span>{metrics.sortedMonths.length} active months</span>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Top Categories Breakdown */}
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag size={16} color={THEME.accent} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                    Top Expense Categories
                  </span>
                </div>
                <button
                  onClick={() => setActiveView("categories")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--t-accent)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  All Categories <ChevronRight size={14} />
                </button>
              </div>

              {metrics.sortedCategories.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No categorized expenses found.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {metrics.sortedCategories.slice(0, 5).map((cat) => {
                    const pct = metrics.totalCharges > 0 ? Math.round((cat.amount / metrics.totalCharges) * 100) : 0;
                    const catColor = getCategoryColor(cat.category);
                    return (
                      <div
                        key={cat.category}
                        onClick={() => setSelectedCategoryModal(cat.category)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          padding: "6px 8px",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = "var(--t-surface)")}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                background: `color-mix(in srgb, ${catColor} 15%, transparent)`,
                                color: catColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {getCategoryIcon(cat.category)}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                              {cat.category}
                            </span>
                            <span style={{ fontSize: 11, color: THEME.muted }}>
                              ({cat.count} txn{cat.count !== 1 ? "s" : ""})
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              <Prv>{fmtINRFull(cat.amount)}</Prv>
                            </span>
                            <Badge variant="neutral" style={{ fontSize: 10, padding: "2px 6px" }}>
                              {pct}%
                            </Badge>
                          </div>
                        </div>
                        <div style={{ height: 5, background: "var(--t-line)", borderRadius: 3, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: catColor,
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
          </div>

          {/* Cards Portfolio Performance Grid */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink }}>
                  Card-Wise Spending & Outflow Breakdown
                </div>
                <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 2 }}>
                  Distribution of spends and settlements across your active credit and prepaid cards.
                </div>
              </div>
            </div>

            {metrics.sortedCardSpends.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: THEME.muted, fontSize: 13 }}>
                No card spending records found.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--t-line)", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "10px 8px", textAlign: "left" }}>Card</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Type</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Total Spends</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Payments / Loads</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>Txns</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>Share of Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.sortedCardSpends.map((cs) => {
                      const sharePct = metrics.totalCharges > 0 ? Math.round((cs.charges / metrics.totalCharges) * 100) : 0;
                      return (
                        <tr
                          key={cs.cardId}
                          style={{
                            borderBottom: "1px solid var(--t-line)",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "12px 8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <BankLogo bankName={cs.bank || cs.cardName} size={28} />
                              <div>
                                <div style={{ fontWeight: 600, color: THEME.ink }}>{cs.cardName}</div>
                                <div style={{ fontSize: 11, color: THEME.muted }}>
                                  {cs.bank} {cs.last4 ? `•••• ${cs.last4}` : ""} {cs.network ? `· ${cs.network}` : ""}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "center" }}>
                            <Badge variant={cs.cardType === "credit" ? "accent" : "sage"}>
                              {cs.cardType === "credit" ? "Credit" : "Prepaid"}
                            </Badge>
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: THEME.rust }}>
                            <Prv>{fmtINRFull(cs.charges)}</Prv>
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color: THEME.sage }}>
                            <Prv>{fmtINRFull(cs.payments)}</Prv>
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "center", color: THEME.muted }}>
                            {cs.count}
                          </td>
                          <td style={{ padding: "12px 8px", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                              <span style={{ fontWeight: 600, color: THEME.ink }}>{sharePct}%</span>
                              <div style={{ width: 60, height: 6, background: "var(--t-line)", borderRadius: 3, overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${sharePct}%`,
                                    background: cs.cardType === "credit" ? THEME.rust : THEME.sage,
                                    borderRadius: 3,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 2: MONTH-WISE BREAKDOWN & TRENDS */}
      {activeView === "monthly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                  Month-by-Month Card Spends & Flow Ledger
                </h3>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 3 }}>
                  Detailed breakdown of charges, repayments, net outflow, and primary spend drivers across each month.
                </div>
              </div>
              <Badge variant="accent">
                {metrics.sortedMonths.length} Months Tracked
              </Badge>
            </div>

            {metrics.sortedMonths.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: THEME.muted }}>
                No monthly transactions recorded for the selected filter criteria.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--t-line)", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 10px", textAlign: "left" }}>Month</th>
                      <th style={{ padding: "12px 10px", textAlign: "right" }}>Charges / Spends</th>
                      <th style={{ padding: "12px 10px", textAlign: "right" }}>Payments / Settlements</th>
                      <th style={{ padding: "12px 10px", textAlign: "right" }}>Net Outflow</th>
                      <th style={{ padding: "12px 10px", textAlign: "center" }}>Transactions</th>
                      <th style={{ padding: "12px 10px", textAlign: "left" }}>Top Expense Category</th>
                      <th style={{ padding: "12px 10px", textAlign: "right" }}>Annual Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.sortedMonths.map((m, idx) => {
                      const sharePct = metrics.totalCharges > 0 ? Math.round((m.charges / metrics.totalCharges) * 100) : 0;
                      const isPeak = metrics.peakMonth?.key === m.key;
                      const prevMonth = idx > 0 ? metrics.sortedMonths[idx - 1] : null;
                      const momDiff = prevMonth && prevMonth.charges > 0
                        ? Math.round(((m.charges - prevMonth.charges) / prevMonth.charges) * 100)
                        : null;

                      return (
                        <tr
                          key={m.key}
                          style={{
                            borderBottom: "1px solid var(--t-line)",
                            background: isPeak ? "color-mix(in srgb, var(--t-rust) 4%, transparent)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "14px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 700, color: THEME.ink }}>{m.label}</span>
                              {isPeak && (
                                <Badge variant="danger" style={{ fontSize: 10, padding: "1px 5px" }}>
                                  Peak
                                </Badge>
                              )}
                            </div>
                            {momDiff !== null && (
                              <div
                                style={{
                                  fontSize: 11,
                                  marginTop: 2,
                                  color: momDiff > 0 ? THEME.rust : THEME.sage,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                }}
                              >
                                {momDiff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                                {momDiff > 0 ? `+${momDiff}%` : `${momDiff}%`} vs prev month
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right", fontWeight: 700, color: THEME.rust }}>
                            <Prv>{fmtINRFull(m.charges)}</Prv>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right", fontWeight: 600, color: THEME.sage }}>
                            <Prv>{fmtINRFull(m.payments)}</Prv>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right", fontWeight: 700, color: m.net > 0 ? THEME.ink : THEME.sage }}>
                            <Prv>{fmtINRFull(m.net)}</Prv>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "center", color: THEME.muted }}>
                            {m.count}
                          </td>
                          <td style={{ padding: "14px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ color: getCategoryColor(m.topCategory) }}>
                                {getCategoryIcon(m.topCategory)}
                              </div>
                              <span style={{ fontWeight: 500, color: THEME.ink }}>{m.topCategory}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                              <span style={{ fontWeight: 600, color: THEME.ink }}>{sharePct}%</span>
                              <div style={{ width: 45, height: 5, background: "var(--t-line)", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${sharePct}%`, background: THEME.accent, borderRadius: 3 }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--t-line)", fontWeight: 700, background: "var(--t-surface)" }}>
                      <td style={{ padding: "14px 10px", color: THEME.ink }}>Grand Total</td>
                      <td style={{ padding: "14px 10px", textAlign: "right", color: THEME.rust }}>
                        <Prv>{fmtINRFull(metrics.totalCharges)}</Prv>
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "right", color: THEME.sage }}>
                        <Prv>{fmtINRFull(metrics.totalPayments)}</Prv>
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "right", color: THEME.ink }}>
                        <Prv>{fmtINRFull(metrics.netSpend)}</Prv>
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "center" }}>
                        {metrics.chargeCount}
                      </td>
                      <td style={{ padding: "14px 10px", color: THEME.muted }}>—</td>
                      <td style={{ padding: "14px 10px", textAlign: "right" }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 3: CATEGORY INTELLIGENCE */}
      {activeView === "categories" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {metrics.sortedCategories.map((cat) => {
              const pct = metrics.totalCharges > 0 ? Math.round((cat.amount / metrics.totalCharges) * 100) : 0;
              const catColor = getCategoryColor(cat.category);
              const avgTicket = cat.count > 0 ? Math.round(cat.amount / cat.count) : 0;

              return (
                <Card
                  key={cat.category}
                  style={{
                    padding: 18,
                    cursor: "pointer",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onClick={() => setSelectedCategoryModal(cat.category)}
                  onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: `color-mix(in srgb, ${catColor} 18%, transparent)`,
                          color: catColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {getCategoryIcon(cat.category)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink }}>
                          {cat.category}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted }}>
                          {cat.count} transaction{cat.count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <Badge variant="neutral" style={{ fontWeight: 700 }}>
                      {pct}%
                    </Badge>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink }}>
                      <Prv>{fmtINRFull(cat.amount)}</Prv>
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Average swipe: <Prv>{fmtINRFull(avgTicket)}</Prv>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 6, background: "var(--t-line)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: catColor, borderRadius: 3 }} />
                  </div>

                  {/* Card split chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {Object.entries(cat.cardBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([cardName, amt]) => (
                        <span
                          key={cardName}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "var(--t-surface)",
                            color: THEME.muted,
                            border: "1px solid var(--t-line)",
                          }}
                        >
                          {cardName}: <Prv>{fmtINR(amt)}</Prv>
                        </span>
                      ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: F.Y. & A.Y. TAX HUB */}
      {activeView === "tax_fy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Multi-Year Comparison Table */}
          <Card style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                  Multi-Year Financial Year (F.Y.) & Assessment Year (A.Y.) Ledger
                </h3>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 3 }}>
                  Consolidated tax-year records matching Indian Income Tax filing standards (1st April – 31st March).
                </div>
              </div>
            </div>

            {metrics.sortedFYBreakdown.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: THEME.muted }}>
                No historical FY transaction records found.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--t-line)", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 10px", textAlign: "left" }}>Financial Year (F.Y.)</th>
                      <th style={{ padding: "12px 10px", textAlign: "left" }}>Assessment Year (A.Y.)</th>
                      <th style={{ padding: "12px 10px", textAlign: "right" }}>Total Card Spends</th>
                      <th style={{ padding: "12px 10px", textAlign: "right" }}>Card Bill Payments</th>
                      <th style={{ padding: "12px 10px", textAlign: "center" }}>Transactions</th>
                      <th style={{ padding: "12px 10px", textAlign: "center" }}>SFT Section 285BA Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.sortedFYBreakdown.map((item) => {
                      const isOverSFT = item.charges >= 1000000;
                      return (
                        <tr key={item.fy} style={{ borderBottom: "1px solid var(--t-line)" }}>
                          <td style={{ padding: "14px 10px", fontWeight: 700, color: THEME.ink }}>
                            {item.fy}
                          </td>
                          <td style={{ padding: "14px 10px", color: THEME.muted, fontWeight: 600 }}>
                            {item.ay}
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right", fontWeight: 700, color: THEME.rust }}>
                            <Prv>{fmtINRFull(item.charges)}</Prv>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "right", fontWeight: 600, color: THEME.sage }}>
                            <Prv>{fmtINRFull(item.payments)}</Prv>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "center", color: THEME.muted }}>
                            {item.count}
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "center" }}>
                            <Badge variant={isOverSFT ? "danger" : "sage"}>
                              {isOverSFT ? "Reported to IT Dept (≥ ₹10L)" : "Within Safe Limits (< ₹10L)"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Tax Compliance Rules Card */}
          <Card style={{ padding: 20, background: "var(--t-surface)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Info size={18} color={THEME.accent} />
              <span style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                Key Indian Tax & SFT Credit Card Compliance Points
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, fontSize: 12.5, color: THEME.muted, lineHeight: 1.5 }}>
              <div style={{ background: "var(--t-card)", padding: 14, borderRadius: 10, border: "1px solid var(--t-line)" }}>
                <strong style={{ color: THEME.ink, display: "block", marginBottom: 4 }}>
                  1. ₹10 Lakhs Annual Aggregate (Rule 114E)
                </strong>
                If your total credit card bills or purchases across all accounts of a bank aggregate to ₹10 Lakhs or more in an FY, the bank must report this to the Tax Department via SFT Form 61A.
              </div>
              <div style={{ background: "var(--t-card)", padding: 14, borderRadius: 10, border: "1px solid var(--t-line)" }}>
                <strong style={{ color: THEME.ink, display: "block", marginBottom: 4 }}>
                  2. ₹1 Lakh Cash Payment Threshold
                </strong>
                Any cash payment of ₹1,00,000 or more made toward credit card bill settlement is automatically reported to the Income Tax Department.
              </div>
              <div style={{ background: "var(--t-card)", padding: 14, borderRadius: 10, border: "1px solid var(--t-line)" }}>
                <strong style={{ color: THEME.ink, display: "block", marginBottom: 4 }}>
                  3. AIS / TIS Verification
                </strong>
                Card spends exceeding SFT limits reflect in your Annual Information Statement (AIS) under Form 26AS. Ensure expenses align with declared income sources.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 5: MERCHANTS & NETWORKS */}
      {activeView === "merchants" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {/* Top Merchants Leaderboard */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink }}>
                    Top Vendors & Merchants
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    Where your card money flows the most.
                  </div>
                </div>
              </div>

              {metrics.sortedMerchants.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: THEME.muted, fontSize: 13 }}>
                  No merchant transactions logged yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {metrics.sortedMerchants.slice(0, 10).map((m, idx) => {
                    const sharePct = metrics.totalCharges > 0 ? Math.round((m.amount / metrics.totalCharges) * 100) : 0;
                    return (
                      <div
                        key={m.merchant}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 8,
                          background: idx < 3 ? "color-mix(in srgb, var(--t-accent) 5%, transparent)" : "transparent",
                          borderBottom: "1px solid var(--t-line)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: idx === 0 ? THEME.gold : "var(--t-line)",
                              color: idx === 0 ? "#000" : THEME.ink,
                              fontSize: 11,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: THEME.ink, fontSize: 13 }}>
                              {m.merchant}
                            </div>
                            <div style={{ fontSize: 11, color: THEME.muted }}>
                              {m.count} swipe{m.count !== 1 ? "s" : ""} · {m.topCat}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: THEME.ink, fontSize: 13 }}>
                            <Prv>{fmtINRFull(m.amount)}</Prv>
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>
                            {sharePct}% of total
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Network & Day Distribution */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Payment Network Share */}
              <Card style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink, marginBottom: 14 }}>
                  Payment Network Distribution
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(metrics.networkMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([network, amt]) => {
                      const pct = metrics.totalCharges > 0 ? Math.round((amt / metrics.totalCharges) * 100) : 0;
                      return (
                        <div
                          key={network}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            padding: "10px 12px",
                            borderRadius: 10,
                            background: "var(--t-surface)",
                            border: "1px solid var(--t-line)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 52,
                                  height: 28,
                                  borderRadius: 6,
                                  background: "var(--t-card)",
                                  border: "1px solid var(--t-line)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "2px 6px",
                                  flexShrink: 0,
                                }}
                              >
                                <CardNetworkLogo network={network} height={16} />
                              </div>
                              <span style={{ fontWeight: 700, color: THEME.ink }}>{network}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: THEME.ink }}>
                              <Prv>{fmtINRFull(amt)}</Prv>{" "}
                              <span style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 500 }}>({pct}%)</span>
                            </span>
                          </div>
                          <div style={{ height: 6, background: "var(--t-line)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "var(--t-accent)", borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>

              {/* Weekend vs Weekday Spend */}
              <Card style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: THEME.ink, marginBottom: 14 }}>
                  Spending Habit: Weekday vs Weekend
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "var(--t-surface)", padding: 14, borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: THEME.muted }}>Weekday Spends (Mon-Fri)</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: THEME.ink, marginTop: 4 }}>
                      <Prv>{fmtINRFull(metrics.weekdaySpend)}</Prv>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.accent, marginTop: 2 }}>
                      {metrics.totalCharges > 0 ? Math.round((metrics.weekdaySpend / metrics.totalCharges) * 100) : 0}%
                    </div>
                  </div>
                  <div style={{ background: "var(--t-surface)", padding: 14, borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: THEME.muted }}>Weekend Spends (Sat-Sun)</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: THEME.rust, marginTop: 4 }}>
                      <Prv>{fmtINRFull(metrics.weekendSpend)}</Prv>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.rust, marginTop: 2 }}>
                      {metrics.totalCharges > 0 ? Math.round((metrics.weekendSpend / metrics.totalCharges) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 6: SMART ADVISORY & OPTIMIZATION */}
      {activeView === "optimization" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Billing Cycle Optimizer: Smart Card to Swipe Today */}
          <Card style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "color-mix(in srgb, var(--t-accent) 18%, transparent)",
                  color: "var(--t-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Compass size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                  Smart Swipe Advisor (Max Interest-Free Period)
                </h3>
                <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 2 }}>
                  Cards ranked by maximum interest-free credit runway (up to 50 days) based on today ({new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}).
                </div>
              </div>
            </div>

            {portfolioSummary.rankedCardsForSwipe.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: THEME.muted }}>
                No active credit cards configured.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* 1. HERO RECOMMENDATION BOX FOR #1 TOP SUGGESTED CARD */}
                {(() => {
                  const topPick = portfolioSummary.rankedCardsForSwipe[0];
                  if (!topPick) return null;

                  return (
                    <div
                      style={{
                        background: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 14%, var(--t-card)) 0%, color-mix(in srgb, var(--t-surface) 95%, transparent) 100%)",
                        border: "2px solid var(--t-accent)",
                        borderRadius: 14,
                        padding: 20,
                        boxShadow: "0 6px 24px -4px color-mix(in srgb, var(--t-accent) 25%, transparent)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <BankLogo bankName={topPick.bankName || topPick.issuer || topPick.bank || topPick.cardName} size={40} />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--t-accent)" }}>
                                TOP SUGGESTED CARD FOR TODAY
                              </span>
                              <Badge variant="accent" style={{ fontSize: 10, padding: "2px 7px" }}>
                                Rank #1
                              </Badge>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                              {topPick.cardName}
                            </div>
                            <div style={{ fontSize: 12, color: THEME.muted }}>
                              {topPick.network || "Credit Card"} {topPick.last4 ? `•••• ${topPick.last4}` : ""} {topPick.owner ? `· ${topPick.owner}` : ""}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", fontWeight: 600 }}>
                            Interest-Free Float
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--t-accent)", lineHeight: 1.2 }}>
                            ~{topPick.interestFreeDays} Days
                          </div>
                        </div>
                      </div>

                      {/* Explanation note */}
                      <div
                        style={{
                          background: "var(--t-surface)",
                          borderRadius: 10,
                          padding: "12px 14px",
                          fontSize: 12.5,
                          color: THEME.ink,
                          lineHeight: 1.5,
                          border: "1px solid var(--t-line)",
                          marginBottom: 14,
                        }}
                      >
                        <strong>Why swipe this card today?</strong>{" "}
                        {topPick.hasBillDate ? (
                          <span>
                            This card provides the longest payment runway. Any purchase swiped today will be billed on <strong>{topPick.nextBillDateStr}</strong> ({topPick.daysUntilBill === 0 ? "today" : `${topPick.daysUntilBill} days away`}), and you will have until <strong>{topPick.nextDueDateStr}</strong> to pay without any interest charges.
                          </span>
                        ) : (
                          <span>
                            This card has the highest available credit limit. Configure a statement date (bill date) on this card to get exact interest-free days calculation.
                          </span>
                        )}
                      </div>

                      {/* Quick Snapshot Metrics */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                        <div style={{ background: "var(--t-card)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--t-line)" }}>
                          <div style={{ fontSize: 11, color: THEME.muted }}>Statement Date</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
                            {topPick.hasBillDate ? `${topPick.billDateNum}th of month (${topPick.nextBillDateStr})` : "Not set"}
                          </div>
                        </div>
                        <div style={{ background: "var(--t-card)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--t-line)" }}>
                          <div style={{ fontSize: 11, color: THEME.muted }}>Payment Due Date</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
                            {topPick.hasDueDay ? `${topPick.dueDayNum}th of month (${topPick.nextDueDateStr})` : "Not set"}
                          </div>
                        </div>
                        <div style={{ background: "var(--t-card)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--t-line)" }}>
                          <div style={{ fontSize: 11, color: THEME.muted }}>Available Limit</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.sage, marginTop: 2 }}>
                            <Prv>{fmtINRFull(topPick.availableLimit)}</Prv>
                          </div>
                        </div>
                        <div style={{ background: "var(--t-card)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--t-line)" }}>
                          <div style={{ fontSize: 11, color: THEME.muted }}>Utilization</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: topPick.utilPct > 30 ? THEME.gold : THEME.sage, marginTop: 2 }}>
                            {topPick.utilPct}% ({fmtINR(topPick.outstanding)} used)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. FULL RANKED COMPARISON TABLE OF ALL CARDS */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 10 }}>
                    All Credit Cards Ranked by Today's Runway
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--t-line)", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                          <th style={{ padding: "10px 8px", textAlign: "left" }}>Rank & Card</th>
                          <th style={{ padding: "10px 8px", textAlign: "left" }}>Next Statement</th>
                          <th style={{ padding: "10px 8px", textAlign: "left" }}>Payment Due</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>Interest-Free Float</th>
                          <th style={{ padding: "10px 8px", textAlign: "right" }}>Available Limit</th>
                          <th style={{ padding: "10px 8px", textAlign: "center" }}>Runway Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioSummary.rankedCardsForSwipe.map((c: any, idx: number) => {
                          const isTop = idx === 0;
                          const isShort = c.hasBillDate && c.daysUntilBill <= 3;
                          const isGood = c.interestFreeDays >= 35;
                          const statusLabel = isTop
                            ? "Top Recommendation"
                            : isShort
                            ? "Billed Soon (< 3 days)"
                            : isGood
                            ? "Good Runway"
                            : c.hasBillDate
                            ? "Moderate Runway"
                            : "Statement Date Not Set";
                          const statusVariant = isTop ? "accent" : isShort ? "warning" : isGood ? "sage" : "neutral";

                          return (
                            <tr
                              key={c.id}
                              style={{
                                borderBottom: "1px solid var(--t-line)",
                                background: isTop ? "color-mix(in srgb, var(--t-accent) 4%, transparent)" : "transparent",
                              }}
                            >
                              <td style={{ padding: "12px 8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: "50%",
                                      background: isTop ? "var(--t-accent)" : "var(--t-line)",
                                      color: isTop ? "#fff" : THEME.muted,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <BankLogo bankName={c.bankName || c.issuer || c.bank || c.cardName} size={28} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: THEME.ink }}>{c.cardName}</div>
                                    <div style={{ fontSize: 11, color: THEME.muted }}>
                                      {c.network || "Card"} {c.last4 ? `•••• ${c.last4}` : ""}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "12px 8px", color: THEME.ink }}>
                                <div>{c.hasBillDate ? c.nextBillDateStr : "—"}</div>
                                {c.hasBillDate && (
                                  <div style={{ fontSize: 11, color: THEME.muted }}>
                                    {c.daysUntilBill === 0 ? "Today" : `in ${c.daysUntilBill} day${c.daysUntilBill !== 1 ? "s" : ""}`}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "12px 8px", color: THEME.ink }}>
                                {c.hasDueDay ? c.nextDueDateStr : "—"}
                              </td>
                              <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: isTop ? "var(--t-accent)" : THEME.ink }}>
                                ~{c.interestFreeDays} Days
                              </td>
                              <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                <div style={{ fontWeight: 600, color: THEME.sage }}>
                                  <Prv>{fmtINRFull(c.availableLimit)}</Prv>
                                </div>
                                <div style={{ fontSize: 10, color: THEME.muted }}>
                                  {c.utilPct}% used
                                </div>
                              </td>
                              <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                <Badge variant={statusVariant as any}>
                                  {statusLabel}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Annual Fee Waiver Milestones */}
          <Card style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "color-mix(in srgb, var(--t-gold) 18%, transparent)",
                  color: THEME.gold,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Award size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                  Annual Fee Waiver Milestones Tracker
                </h3>
                <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 2 }}>
                  Track annual spending targets required to reverse/waive credit card membership fees.
                </div>
              </div>
            </div>

            {creditCards.filter((c: any) => Number(c.annualFee) > 0).length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0", color: THEME.muted, fontSize: 13 }}>
                All your cards are Lifetime Free (LTF) or have zero annual fees!
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
                {creditCards
                  .filter((c: any) => Number(c.annualFee) > 0)
                  .map((c: any) => {
                    const feeDate = getNextFeeDate(c);
                    const spendTarget = Number(c.feeWaiverSpendTarget || 0);
                    const cardSpends = (c.transactions || [])
                      .filter((t: any) => Number(t.amount) > 0)
                      .reduce((s: number, t: any) => s + Number(t.amount), 0);
                    const progressPct = spendTarget > 0 ? Math.min(100, Math.round((cardSpends / spendTarget) * 100)) : 0;
                    const isWaived = spendTarget > 0 && cardSpends >= spendTarget;

                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          background: "var(--t-surface)",
                          border: "1px solid var(--t-line)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <BankLogo bankName={c.issuer || c.bankName || c.bank || c.cardName} size={32} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                                {getCardDisplayName(c)}
                              </div>
                              <div style={{ fontSize: 11, color: THEME.muted }}>
                                Fee: <Prv>{fmtINRFull(c.annualFee)}</Prv>/yr {feeDate ? `· Due on ${feeDate.dateStr}` : ""}
                              </div>
                            </div>
                          </div>
                          <Badge variant={isWaived ? "sage" : spendTarget > 0 ? "warning" : "neutral"}>
                            {isWaived ? "Target Met (Waived)" : spendTarget > 0 ? `${progressPct}% Done` : "No Target"}
                          </Badge>
                        </div>

                        {spendTarget > 0 ? (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.muted, marginTop: 10, marginBottom: 4 }}>
                              <span>
                                Spent: <Prv><strong>{fmtINRFull(cardSpends)}</strong></Prv>
                              </span>
                              <span>
                                Target: <Prv><strong>{fmtINRFull(spendTarget)}</strong></Prv>
                              </span>
                            </div>
                            <div style={{ height: 6, background: "var(--t-line)", borderRadius: 3, overflow: "hidden" }}>
                              <div
                                style={{
                                  height: "100%",
                                  width: `${progressPct}%`,
                                  background: isWaived ? THEME.sage : THEME.gold,
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                            {!isWaived && (
                              <div style={{ fontSize: 11, color: THEME.rust, marginTop: 6, fontWeight: 500 }}>
                                Need <Prv>{fmtINRFull(spendTarget - cardSpends)}</Prv> more spend to waive annual fee.
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 8 }}>
                            Set a Fee Waiver Spend Target in card settings to track progress automatically.
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 7: UNIFIED LEDGER & TRANSACTIONS */}
      {activeView === "ledger" && (
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                Unified Card Transaction Ledger
              </h3>
              <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 2 }}>
                Showing {sortedTransactions.length} filtered transactions across cards.
              </div>
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  border: "1px solid var(--t-line)",
                  background: "var(--t-surface)",
                  color: THEME.ink,
                  outline: "none",
                }}
              >
                <option value="date_desc">Date (Newest First)</option>
                <option value="date_asc">Date (Oldest First)</option>
                <option value="amt_desc">Amount (Highest First)</option>
                <option value="amt_asc">Amount (Lowest First)</option>
              </select>
            </div>
          </div>

          {sortedTransactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: THEME.muted }}>
              No transactions match your active search and filter criteria.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--t-line)", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 8px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "10px 8px", textAlign: "left" }}>Merchant / Description</th>
                    <th style={{ padding: "10px 8px", textAlign: "left" }}>Category</th>
                    <th style={{ padding: "10px 8px", textAlign: "left" }}>Card</th>
                    <th style={{ padding: "10px 8px", textAlign: "center" }}>Type</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((t) => {
                    const isExpense = t.type === "charge";
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid var(--t-line)" }}>
                        <td style={{ padding: "12px 8px", whiteSpace: "nowrap", color: THEME.muted }}>
                          {fmtDate(t.date)}
                        </td>
                        <td style={{ padding: "12px 8px", fontWeight: 600, color: THEME.ink }}>
                          <div>{t.merchant}</div>
                          {t.variantName && t.variantName !== "Primary" && (
                            <span style={{ fontSize: 10, color: THEME.muted }}>
                              Variant: {t.variantName}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ color: getCategoryColor(t.category) }}>
                              {getCategoryIcon(t.category)}
                            </div>
                            <span>{t.category}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <BankLogo bankName={t.bank || t.cardName} size={28} />
                            <div>
                              <div style={{ fontWeight: 600, color: THEME.ink }}>{t.cardName}</div>
                              <div style={{ fontSize: 11, color: THEME.muted }}>
                                {t.bank} {t.last4 ? `•••• ${t.last4}` : ""} {t.network ? `· ${t.network}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <Badge variant={isExpense ? "danger" : "sage"}>
                            {t.type.toUpperCase()}
                          </Badge>
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: isExpense ? THEME.rust : THEME.sage,
                          }}
                        >
                          <Prv>{isExpense ? `- ${fmtINRFull(t.amount)}` : `+ ${fmtINRFull(t.amount)}`}</Prv>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Category Drill-Down Modal */}
      {selectedCategoryModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setSelectedCategoryModal(null)}
        >
          <div
            style={{
              background: "var(--t-card)",
              borderRadius: 16,
              maxWidth: 600,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              border: "1px solid var(--t-line)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${getCategoryColor(selectedCategoryModal)} 20%, transparent)`,
                    color: getCategoryColor(selectedCategoryModal),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getCategoryIcon(selectedCategoryModal)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: THEME.ink }}>
                    {selectedCategoryModal} Expenses
                  </h3>
                  <div style={{ fontSize: 12.5, color: THEME.muted }}>
                    All transactions in this category.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategoryModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: THEME.muted,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allNormalizedTransactions
                .filter((t) => t.category === selectedCategoryModal && t.type === "charge")
                .map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--t-surface)",
                      border: "1px solid var(--t-line)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <BankLogo bankName={t.bank || t.cardName} size={28} />
                      <div>
                        <div style={{ fontWeight: 600, color: THEME.ink }}>{t.merchant}</div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>
                          {fmtDate(t.date)} · {t.cardName} {t.last4 ? `(•••• ${t.last4})` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: THEME.rust, fontSize: 14 }}>
                      <Prv>{fmtINRFull(t.amount)}</Prv>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
