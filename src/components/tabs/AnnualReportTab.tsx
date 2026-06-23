// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  PieChart as PieIcon,
  Shield,
  Receipt,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Landmark,
  Building2,
  ChevronDown,
  DollarSign,
  BarChart2,
  AlertTriangle,
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
import { fmtINR, fmtINRFull, today, calcCAGR } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */

const getFYDates = (fy: string) => {
  const startYear = parseInt(fy.split("-")[0]);
  return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
};

const getFYLabel = (fy: string) => {
  const startYear = parseInt(fy.split("-")[0]);
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
};

const MONTH_NAMES = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

/** Generate all 12 months of a FY as YYYY-MM strings */
const getFYMonths = (fy: string): string[] => {
  const startYear = parseInt(fy.split("-")[0]);
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((3 + i) % 12) + 1; // Apr=4 ... Mar=3
    const y = m >= 4 ? startYear : startYear + 1;
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return months;
};

const pctChange = (v1: number, v2: number) =>
  v2 !== 0 ? ((v1 - v2) / Math.abs(v2)) * 100 : v1 > 0 ? 100 : 0;

const formatDateReadable = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const printStyles = `@media print {
  body * { visibility: hidden; }
  .annual-report, .annual-report * { visibility: visible; }
  .annual-report { position: absolute; left: 0; top: 0; width: 100%; font-size: 11px; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
}`;

/* ── Tiny sub-components ───────────────────────────────────────── */

const StatBox = ({ label, value, sub, color, masked = true }: any) => (
  <div style={{ flex: 1, minWidth: 140, padding: "16px 20px", background: `${THEME.accent}08`, borderRadius: 12, textAlign: "center" }}>
    <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || THEME.ink, letterSpacing: "-0.02em" }}>
      {masked ? <Prv>{value}</Prv> : value}
    </div>
    {sub && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>{sub}</div>}
  </div>
);

const SectionHeader = ({ icon: Icon, title, id }: any) => (
  <div id={id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, marginTop: 8 }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${THEME.accent}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={18} color={THEME.accent} />
    </div>
    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: THEME.ink, letterSpacing: "-0.02em" }}>{title}</h3>
  </div>
);

const TableRow = ({ label, value, bold, color }: any) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${THEME.line}` }}>
    <span style={{ fontSize: 13, color: THEME.muted, fontWeight: bold ? 700 : 500 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: color || THEME.ink }}>
      <Prv>{value}</Prv>
    </span>
  </div>
);

const ProgressBar = ({ pct, color, height = 8 }: any) => (
  <div style={{ width: "100%", height, borderRadius: height, background: `${THEME.line}` }}>
    <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", borderRadius: height, background: color || THEME.accent, transition: "width 0.4s ease" }} />
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export const AnnualReportTab = ({ state, metrics }: any) => {
  // ── Inject print styles ────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "annual-report-print";
    style.textContent = printStyles;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  // ── FY selection ───────────────────────────────────────────────
  const availableFYs = useMemo(() => {
    const fySet = new Set<number>();
    const addDate = (d: string) => {
      if (!d) return;
      const dt = new Date(d + "T00:00:00");
      const yr = dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
      fySet.add(yr);
    };
    (state.income || []).forEach((i: any) => addDate(i.date));
    (state.transactions || []).forEach((t: any) => addDate(t.date));
    (state.netWorthHistory || []).forEach((h: any) => {
      if (h.month) {
        const [y, m] = h.month.split("-").map(Number);
        fySet.add(m >= 4 ? y : y - 1);
      }
    });
    // Always include current FY
    const now = new Date();
    const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    fySet.add(currentFYStart);
    if (currentFYStart > 0) fySet.add(currentFYStart - 1);
    return Array.from(fySet)
      .sort((a, b) => b - a)
      .map((y) => `${y}-${String(y + 1).slice(-2)}`);
  }, [state.income, state.transactions, state.netWorthHistory]);

  const [selectedFY, setSelectedFY] = useState(availableFYs[0] || "2025-26");
  const { start: fyStart, end: fyEnd } = getFYDates(selectedFY);
  const fyLabel = getFYLabel(selectedFY);
  const fyMonths = getFYMonths(selectedFY);
  const fyStartYear = parseInt(selectedFY.split("-")[0]);

  const fyMonthsElapsed = useMemo(() => {
    const todayStr = today();
    const todayYM = todayStr.slice(0, 7);
    const startYM = fyStart.slice(0, 7);
    const endYM = fyEnd.slice(0, 7);
    if (todayYM < startYM) return 0;
    if (todayYM > endYM) return 12;
    const curMonth = parseInt(todayYM.slice(5, 7));
    const curYear = parseInt(todayYM.slice(0, 4));
    const sMonth = parseInt(startYM.slice(5, 7));
    const sYear = parseInt(startYM.slice(0, 4));
    return (curYear - sYear) * 12 + (curMonth - sMonth) + 1;
  }, [fyStart, fyEnd]);

  const isPastFY = fyMonthsElapsed >= 12 || today().slice(0, 7) > fyEnd.slice(0, 7);

  // Also compute previous FY for comparisons
  const prevFY = `${fyStartYear - 1}-${String(fyStartYear).slice(-2)}`;
  const { start: prevFyStart, end: prevFyEnd } = getFYDates(prevFY);

  /* ═══════════════════════════════════════════════════════════════
     (a) NET WORTH SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const netWorthData = useMemo(() => {
    const history = (state.netWorthHistory || [])
      .filter((h: any) => h.month)
      .sort((a: any, b: any) => a.month.localeCompare(b.month));

    // Find opening NW (first month of FY or last entry before FY)
    const aprilKey = `${fyStartYear}-04`;
    const marchKey = `${fyStartYear + 1}-03`;
    const todayYM = today().slice(0, 7);

    // NW at FY start — find the entry for Apr or closest before
    const openingEntry = history.find((h: any) => h.month === aprilKey) ||
      [...history].reverse().find((h: any) => h.month < aprilKey);
    const openingNW = openingEntry ? Number(openingEntry.netWorth || 0) : 0;

    // NW at FY end (or current if FY is ongoing)
    const closingEntry = history.find((h: any) => h.month === marchKey) ||
      [...history].reverse().find((h: any) => h.month >= aprilKey && h.month <= (todayYM < marchKey ? todayYM : marchKey));
    // If current FY, use live metrics.netWorth as closing
    const isCurrentFY = todayYM >= aprilKey && todayYM <= marchKey;
    const closingNW = isCurrentFY && metrics.netWorth > 0
      ? metrics.netWorth
      : closingEntry ? Number(closingEntry.netWorth || 0) : 0;

    const change = closingNW - openingNW;
    const changePct = openingNW !== 0 ? (change / Math.abs(openingNW)) * 100 : closingNW > 0 ? 100 : 0;

    // Trend chart data — each month of the FY
    const chartData = fyMonths.map((ym, idx) => {
      const entry = history.find((h: any) => h.month === ym);
      let nw = entry ? Number(entry.netWorth || 0) : 0;
      // For current month in current FY, use live value
      if (isCurrentFY && ym === todayYM && metrics.netWorth > 0) {
        nw = metrics.netWorth;
      }
      return { month: MONTH_NAMES[idx], value: nw };
    }).filter((d) => d.value > 0);

    return { openingNW, closingNW, change, changePct, chartData, isCurrentFY };
  }, [state.netWorthHistory, metrics.netWorth, selectedFY]);

  /* ═══════════════════════════════════════════════════════════════
     (b) INCOME SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const incomeData = useMemo(() => {
    // From income ledger
    const incomeLedger = (state.income || [])
      .filter((i: any) => i.date && i.date >= fyStart && i.date <= fyEnd);
    const ledgerTotal = incomeLedger.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    // From credit transactions
    const creditTxns = (state.transactions || [])
      .filter((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type === "credit");
    const creditTotal = creditTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    // Use income ledger if available, else credit transactions
    const totalIncome = ledgerTotal > 0 ? ledgerTotal : creditTotal;
    const sourceEntries = ledgerTotal > 0 ? incomeLedger : creditTxns;

    // Breakdown by category
    const catMap: Record<string, number> = {};
    sourceEntries.forEach((e: any) => {
      const cat = e.category || e.source || "Other";
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0);
    });
    const breakdown = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Monthly bar chart
    const monthlyMap: Record<string, number> = {};
    sourceEntries.forEach((e: any) => {
      if (e.date) {
        const ym = e.date.slice(0, 7);
        monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(e.amount || 0);
      }
    });
    const monthlyChart = fyMonths.map((ym, idx) => ({
      month: MONTH_NAMES[idx],
      income: monthlyMap[ym] || 0,
    }));

    // Rent income from rental properties
    const rentalIncome = (state.rentalProperties || []).reduce((sum: number, p: any) => {
      const payments = (p.payments || [])
        .filter((pay: any) => pay.date && pay.date >= fyStart && pay.date <= fyEnd);
      return sum + payments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
    }, 0);
    if (rentalIncome > 0 && !catMap["Rental"]) {
      catMap["Rental Income"] = rentalIncome;
      breakdown.push({ name: "Rental Income", value: rentalIncome });
      breakdown.sort((a, b) => b.value - a.value);
    }

    return { totalIncome: totalIncome + rentalIncome, breakdown, monthlyChart };
  }, [state.income, state.transactions, state.rentalProperties, selectedFY]);

  /* ═══════════════════════════════════════════════════════════════
     (c) EXPENSE SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const expenseData = useMemo(() => {
    const debitTxns = (state.transactions || [])
      .filter((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type === "debit");
    const txnExpense = debitTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    // Rent paid
    const rentPaid = (state.rentedProperties || []).reduce((sum: number, p: any) =>
      sum + (p.payments || [])
        .filter((pay: any) => pay.date && pay.date >= fyStart && pay.date <= fyEnd)
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0), 0);

    const totalExpense = txnExpense + rentPaid;

    // Category breakdown
    const catMap: Record<string, number> = {};
    debitTxns.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
    });
    if (rentPaid > 0) {
      catMap["Rent"] = (catMap["Rent"] || 0) + rentPaid;
    }
    const breakdown = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const top5 = breakdown.slice(0, 5);

    // Monthly breakdown
    const monthlyMap: Record<string, number> = {};
    debitTxns.forEach((t: any) => {
      if (t.date) {
        const ym = t.date.slice(0, 7);
        monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(t.amount || 0);
      }
    });
    // Add rent to monthly
    (state.rentedProperties || []).forEach((p: any) => {
      (p.payments || [])
        .filter((pay: any) => pay.date && pay.date >= fyStart && pay.date <= fyEnd)
        .forEach((pay: any) => {
          const ym = pay.date.slice(0, 7);
          monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(pay.amount || 0);
        });
    });

    const divisor = fyMonthsElapsed || 1;
    const avgMonthly = totalExpense / divisor;

    // Highest single expense
    const highestExpense = debitTxns.length > 0
      ? debitTxns.reduce((max: any, t: any) => Number(t.amount || 0) > Number(max.amount || 0) ? t : max, debitTxns[0])
      : null;

    return { totalExpense, breakdown, top5, avgMonthly, highestExpense, monthlyMap };
  }, [state.transactions, state.rentedProperties, selectedFY, fyMonthsElapsed]);

  /* ═══════════════════════════════════════════════════════════════
     (d) SAVINGS & INVESTMENT
     ═══════════════════════════════════════════════════════════════ */
  const savingsData = useMemo(() => {
    const savings = incomeData.totalIncome - expenseData.totalExpense;
    const savingsRate = incomeData.totalIncome > 0
      ? (savings / incomeData.totalIncome) * 100 : 0;

    // New investments during FY
    const stockBuys = (state.stocks || [])
      .filter((s: any) => s.buyDate && s.buyDate >= fyStart && s.buyDate <= fyEnd)
      .reduce((sum: number, s: any) => sum + Number(s.invested || (s.avgPrice || 0) * (s.qty || 0) || 0), 0);

    const mfBuys = (state.mutualFunds || [])
      .filter((m: any) => m.buyDate && m.buyDate >= fyStart && m.buyDate <= fyEnd)
      .reduce((sum: number, m: any) => sum + Number(m.invested || m.investedAmount || 0), 0);

    const fdAdds = (state.fixedDeposits || [])
      .filter((fd: any) => fd.startDate && fd.startDate >= fyStart && fd.startDate <= fyEnd)
      .reduce((sum: number, fd: any) => sum + Number(fd.principal || 0), 0);

    const ppfAdds = (state.ppfLedger || [])
      .filter((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type !== "withdrawal")
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    const sipTotal = (state.sips || []).reduce((s: number, sip: any) => s + Number(sip.amount || 0), 0) * 12;

    const totalNewInvestments = stockBuys + mfBuys + fdAdds + ppfAdds;

    // Realized gains
    const stcg = (state.stockSells || [])
      .filter((s: any) => s.sellDate && s.sellDate >= fyStart && s.sellDate <= fyEnd)
      .reduce((sum: number, s: any) => {
        const gain = Number(s.sellAmount || 0) - Number(s.invested || 0);
        const holdDays = s.buyDate && s.sellDate
          ? (new Date(s.sellDate).getTime() - new Date(s.buyDate).getTime()) / (1000 * 60 * 60 * 24) : 0;
        return holdDays <= 365 ? sum + gain : sum;
      }, 0);

    const ltcg = (state.stockSells || [])
      .filter((s: any) => s.sellDate && s.sellDate >= fyStart && s.sellDate <= fyEnd)
      .reduce((sum: number, s: any) => {
        const gain = Number(s.sellAmount || 0) - Number(s.invested || 0);
        const holdDays = s.buyDate && s.sellDate
          ? (new Date(s.sellDate).getTime() - new Date(s.buyDate).getTime()) / (1000 * 60 * 60 * 24) : 0;
        return holdDays > 365 ? sum + gain : sum;
      }, 0);

    const mfStcg = (state.mfSells || [])
      .filter((s: any) => s.sellDate && s.sellDate >= fyStart && s.sellDate <= fyEnd)
      .reduce((sum: number, s: any) => {
        const gain = Number(s.sellAmount || 0) - Number(s.invested || 0);
        const holdDays = s.buyDate && s.sellDate
          ? (new Date(s.sellDate).getTime() - new Date(s.buyDate).getTime()) / (1000 * 60 * 60 * 24) : 0;
        return holdDays <= 365 ? sum + gain : sum;
      }, 0);

    const mfLtcg = (state.mfSells || [])
      .filter((s: any) => s.sellDate && s.sellDate >= fyStart && s.sellDate <= fyEnd)
      .reduce((sum: number, s: any) => {
        const gain = Number(s.sellAmount || 0) - Number(s.invested || 0);
        const holdDays = s.buyDate && s.sellDate
          ? (new Date(s.sellDate).getTime() - new Date(s.buyDate).getTime()) / (1000 * 60 * 60 * 24) : 0;
        return holdDays > 365 ? sum + gain : sum;
      }, 0);

    return {
      savings,
      savingsRate,
      stockBuys,
      mfBuys,
      fdAdds,
      ppfAdds,
      sipTotal,
      totalNewInvestments,
      stcg: stcg + mfStcg,
      ltcg: ltcg + mfLtcg,
    };
  }, [incomeData, expenseData, state.stocks, state.mutualFunds, state.fixedDeposits, state.ppfLedger, state.sips, state.stockSells, state.mfSells, selectedFY]);

  /* ═══════════════════════════════════════════════════════════════
     (e) ASSET ALLOCATION
     ═══════════════════════════════════════════════════════════════ */
  const assetAllocation = useMemo(() => {
    const equity = (metrics.stockValue || 0) + (metrics.mfValue || 0) * 0.7; // Rough: 70% MF as equity
    const debt = (metrics.fdValue || 0) + (metrics.rdValue || 0) + (metrics.bondValue || 0) +
      (metrics.ppfValue || 0) + (metrics.npsValue || 0) + (metrics.epfValue || 0) +
      (metrics.licValue || 0) + (metrics.investmentValue || 0) + (metrics.mfValue || 0) * 0.3;
    const cash = metrics.cashInBanks || 0;
    const realEstate = (metrics.realEstateAsset || 0) + (metrics.rentalPropertiesAsset || 0);
    const gold = 0; // Gold not separately tracked in current schema
    const others = (metrics.vehicleAsset || 0) + (metrics.informalLentValue || 0);

    const alloc = [
      { name: "Equity", value: Math.round(equity) },
      { name: "Debt", value: Math.round(debt) },
      { name: "Cash", value: Math.round(cash) },
      { name: "Real Estate", value: Math.round(realEstate) },
      { name: "Others", value: Math.round(others) },
    ].filter((a) => a.value > 0);

    const total = alloc.reduce((s, a) => s + a.value, 0);

    // Previous FY net worth for comparison
    const prevMarchKey = `${fyStartYear}-03`;
    const prevEntry = (state.netWorthHistory || []).find((h: any) => h.month === prevMarchKey);
    const prevNW = prevEntry ? Number(prevEntry.netWorth || 0) : 0;

    return { alloc, total, prevNW };
  }, [metrics, state.netWorthHistory, selectedFY]);

  /* ═══════════════════════════════════════════════════════════════
     (f) DEBT SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const debtData = useMemo(() => {
    const loans = state.loansTaken || [];
    const totalOutstanding = loans.reduce((s: number, l: any) => s + Number(l.outstanding || 0), 0);
    const totalPrincipal = loans.reduce((s: number, l: any) => s + Number(l.principal || 0), 0);
    const totalEMI = loans.reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    const annualEMI = totalEMI * 12;

    // Estimate principal vs interest from EMI (rough split)
    const avgRate = loans.length > 0
      ? loans.reduce((s: number, l: any) => s + Number(l.interestRate || l.rate || 0), 0) / loans.length
      : 0;
    const interestPortion = totalOutstanding * (avgRate / 100);
    const principalRepaid = Math.max(0, annualEMI - interestPortion);

    // CC outstanding
    const ccOutstanding = (state.creditCards || [])
      .reduce((s: number, c: any) => s + Number(c.outstanding || 0), 0);

    return {
      loanCount: loans.length,
      totalOutstanding,
      totalPrincipal,
      totalEMI,
      annualEMI,
      principalRepaid,
      interestPortion,
      ccOutstanding,
    };
  }, [state.loansTaken, state.creditCards]);

  /* ═══════════════════════════════════════════════════════════════
     (g) INSURANCE COVERAGE
     ═══════════════════════════════════════════════════════════════ */
  const insuranceData = useMemo(() => {
    const licPolicies = state.lic || [];
    const termPlans = state.termPlans || [];
    const investPlans = state.investmentPlans || [];

    // Total life cover
    const licCover = licPolicies.reduce((s: number, p: any) => s + Number(p.sumAssured || 0), 0);
    const termCover = termPlans.reduce((s: number, p: any) => s + Number(p.coverAmount || 0), 0);
    const totalLifeCover = licCover + termCover;

    // Premiums paid during FY
    const licPremiums = licPolicies.reduce((s: number, p: any) => {
      // From transactions within FY
      const txnPremium = (p.transactions || [])
        .filter((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd)
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      // Fallback to annual premium if no transactions
      return s + (txnPremium > 0 ? txnPremium : Number(p.annualPremium || 0));
    }, 0);

    const termPremiums = termPlans.reduce((s: number, p: any) => s + Number(p.annualPremium || p.premium || 0), 0);
    const investPremiums = investPlans.reduce((s: number, p: any) => s + Number(p.annualPremium || p.premium || 0), 0);
    const totalPremiums = licPremiums + termPremiums + investPremiums;

    // Coverage adequacy (rule of thumb: 10x annual income)
    const adequacyRatio = incomeData.totalIncome > 0
      ? totalLifeCover / incomeData.totalIncome : 0;

    return {
      licCount: licPolicies.length,
      termCount: termPlans.length,
      totalLifeCover,
      totalPremiums,
      adequacyRatio,
    };
  }, [state.lic, state.termPlans, state.investmentPlans, incomeData.totalIncome, selectedFY]);

  /* ═══════════════════════════════════════════════════════════════
     (h) TAX SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const taxData = useMemo(() => {
    const payments = (state.taxPayments || [])
      .filter((p: any) => p.date && p.date >= fyStart && p.date <= fyEnd);

    const totalTaxPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const byType: Record<string, number> = {};
    payments.forEach((p: any) => {
      const t = p.type || "Other";
      byType[t] = (byType[t] || 0) + Number(p.amount || 0);
    });

    const regime = state.profile?.regime || "new";
    const effectiveRate = incomeData.totalIncome > 0
      ? (totalTaxPaid / incomeData.totalIncome) * 100 : 0;

    return { totalTaxPaid, byType, regime, effectiveRate, paymentCount: payments.length };
  }, [state.taxPayments, state.profile?.regime, incomeData.totalIncome, selectedFY]);

  /* ═══════════════════════════════════════════════════════════════
     (i) GOALS PROGRESS
     ═══════════════════════════════════════════════════════════════ */
  const goalsData = useMemo(() => {
    const goals = state.goals || [];
    const totalGoals = goals.length;
    const completed = goals.filter((g: any) => {
      const target = Number(g.targetAmount || g.target || 0);
      const saved = Number(g.savedAmount || g.currentAmount || g.saved || 0);
      return target > 0 && saved >= target;
    }).length;

    const topGoals = goals.slice(0, 5).map((g: any) => {
      const target = Number(g.targetAmount || g.target || 0);
      const saved = Number(g.savedAmount || g.currentAmount || g.saved || 0);
      const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
      return { name: g.name || g.goalName || "Goal", target, saved, pct };
    });

    const overallPct = metrics.totalGoalTarget > 0
      ? Math.min((metrics.totalGoalSaved / metrics.totalGoalTarget) * 100, 100) : 0;

    return { totalGoals, completed, topGoals, overallPct };
  }, [state.goals, metrics.totalGoalTarget, metrics.totalGoalSaved]);

  /* ═══════════════════════════════════════════════════════════════
     (j) KEY HIGHLIGHTS
     ═══════════════════════════════════════════════════════════════ */
  const highlights = useMemo(() => {
    const items: { icon: string; text: string; color: string }[] = [];

    // Highest single expense
    if (expenseData.highestExpense) {
      const e = expenseData.highestExpense;
      items.push({
        icon: "💸",
        text: `Highest single expense: ${fmtINRFull(e.amount)} — ${e.note || e.category || "Transaction"} (${e.date || ""})`,
        color: THEME.rust,
      });
    }

    // Largest investment made
    const allInvestments: { amount: number; name: string }[] = [];
    (state.stocks || [])
      .filter((s: any) => s.buyDate && s.buyDate >= fyStart && s.buyDate <= fyEnd)
      .forEach((s: any) => allInvestments.push({ amount: Number(s.invested || (s.avgPrice || 0) * (s.qty || 0) || 0), name: s.name || s.symbol || "Stock" }));
    (state.mutualFunds || [])
      .filter((m: any) => m.buyDate && m.buyDate >= fyStart && m.buyDate <= fyEnd)
      .forEach((m: any) => allInvestments.push({ amount: Number(m.invested || m.investedAmount || 0), name: m.name || m.scheme || "MF" }));
    (state.fixedDeposits || [])
      .filter((fd: any) => fd.startDate && fd.startDate >= fyStart && fd.startDate <= fyEnd)
      .forEach((fd: any) => allInvestments.push({ amount: Number(fd.principal || 0), name: `FD at ${fd.bank || "Bank"}` }));

    if (allInvestments.length > 0) {
      const largest = allInvestments.reduce((max, i) => i.amount > max.amount ? i : max, allInvestments[0]);
      items.push({
        icon: "📈",
        text: `Largest investment: ${fmtINRFull(largest.amount)} in ${largest.name}`,
        color: THEME.sage,
      });
    }

    // Best performing stock/MF (unrealized)
    const stockPnLs = (state.stocks || []).map((s: any) => {
      const invested = Number(s.invested || (s.avgPrice || 0) * (s.qty || 0) || 0);
      const current = Number(s.currentValue || s.ltp * (s.qty || 0) || 0);
      const gain = current - invested;
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
      return { name: s.name || s.symbol || "Stock", gain, gainPct };
    });
    const mfPnLs = (state.mutualFunds || []).map((m: any) => {
      const invested = Number(m.invested || m.investedAmount || 0);
      const current = Number(m.currentValue || m.nav * (m.units || 0) || 0);
      const gain = current - invested;
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
      return { name: m.name || m.scheme || "MF", gain, gainPct };
    });
    const allPnL = [...stockPnLs, ...mfPnLs].filter((p) => p.gain > 0);
    if (allPnL.length > 0) {
      const best = allPnL.reduce((max, p) => p.gainPct > max.gainPct ? p : max, allPnL[0]);
      items.push({
        icon: "🏆",
        text: `Best performer: ${best.name} (+${best.gainPct.toFixed(1)}%)`,
        color: "#059669",
      });
    }

    // Net worth milestones
    const milestones = [10000000, 5000000, 2500000, 1000000, 500000, 100000];
    const closingNW = netWorthData.closingNW;
    const openingNW = netWorthData.openingNW;
    for (const m of milestones) {
      if (closingNW >= m && openingNW < m) {
        const label = m >= 10000000 ? `${m / 10000000}Cr` : `${m / 100000}L`;
        items.push({
          icon: "🎯",
          text: `Net worth crossed the ₹${label} milestone this FY`,
          color: THEME.accent,
        });
        break; // Only show highest milestone crossed
      }
    }

    // Goal completed
    if (goalsData.completed > 0) {
      items.push({
        icon: "✅",
        text: `${goalsData.completed} goal${goalsData.completed > 1 ? "s" : ""} completed this FY`,
        color: "#059669",
      });
    }

    // Loan closed (if any loan has outstanding = 0 but principal > 0)
    const closedLoans = (state.loansTaken || []).filter((l: any) =>
      Number(l.principal || 0) > 0 && Number(l.outstanding || 0) === 0
    );
    if (closedLoans.length > 0) {
      items.push({
        icon: "🔓",
        text: `${closedLoans.length} loan${closedLoans.length > 1 ? "s" : ""} fully repaid`,
        color: "#059669",
      });
    }

    // Savings rate achievement
    if (savingsData.savingsRate >= 30) {
      items.push({
        icon: "💪",
        text: `Excellent savings rate of ${savingsData.savingsRate.toFixed(0)}% achieved`,
        color: "#059669",
      });
    }

    return items;
  }, [expenseData, state.stocks, state.mutualFunds, state.fixedDeposits, state.loansTaken, netWorthData, goalsData, savingsData, selectedFY]);

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  const hasAnyData = incomeData.totalIncome > 0 || expenseData.totalExpense > 0 ||
    netWorthData.closingNW > 0 || (state.netWorthHistory || []).length > 0;

  return (
    <div className="annual-report" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <SectionTitle
        sub="Comprehensive financial year summary — print or save as PDF"
        rightElement={
          <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              className="form-input"
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, minWidth: 130 }}
            >
              {availableFYs.map((fy) => (
                <option key={fy} value={fy}>{getFYLabel(fy)}</option>
              ))}
            </select>
            <Button
              variant="accent"
              icon={<Printer size={16} />}
              onClick={() => window.print()}
            >
              Print / PDF
            </Button>
          </div>
        }
      >
        Annual Report
      </SectionTitle>

      {!hasAnyData ? (
        <Card style={{ padding: "64px 32px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, #4F46E5 0%, #818CF8 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <FileText size={30} color="#fff" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>No Data for {fyLabel}</div>
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
            Add income entries, transactions, or investments to generate your annual financial report for {fyLabel}.
          </div>
        </Card>
      ) : (
        <>
          {/* ─── Report Title Banner ─────────────────────────────────── */}
          <Card style={{ padding: "28px 32px", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: THEME.accent, marginBottom: 6 }}>
              Annual Financial Report
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.03em" }}>{fyLabel}</div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
              {formatDateReadable(fyStart)} to {formatDateReadable(fyEnd)}
              {netWorthData.isCurrentFY && <Badge variant="gold" style={{ marginLeft: 8, fontSize: 10 }}>Ongoing</Badge>}
            </div>
          </Card>

          {/* ─── Section Navigation ─────────────────────────────────── */}
          <Card className="no-print" style={{ padding: "14px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { id: "nw", label: "Net Worth" },
                { id: "income", label: "Income" },
                { id: "expense", label: "Expenses" },
                { id: "savings", label: "Savings" },
                { id: "allocation", label: "Assets" },
                ...(debtData.loanCount > 0 || debtData.ccOutstanding > 0 ? [{ id: "debt", label: "Debt" }] : []),
                ...(insuranceData.licCount > 0 || insuranceData.termCount > 0 ? [{ id: "insurance", label: "Insurance" }] : []),
                ...(taxData.totalTaxPaid > 0 ? [{ id: "tax", label: "Tax" }] : []),
                ...(goalsData.totalGoals > 0 ? [{ id: "goals", label: "Goals" }] : []),
                ...(highlights.length > 0 ? [{ id: "highlights", label: "Highlights" }] : []),
                { id: "health", label: "Health" },
              ].map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  style={{ padding: "5px 12px", borderRadius: 20, background: `${THEME.accent}10`, color: THEME.accent, fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer", transition: "background 0.2s" }}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </Card>

          {/* ─── (a) Net Worth Summary ───────────────────────────────── */}
          <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
            <SectionHeader icon={TrendingUp} title="Net Worth Summary" id="nw" />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatBox label="Opening" value={fmtINR(netWorthData.openingNW)} />
              <StatBox label="Closing" value={fmtINR(netWorthData.closingNW)} />
              <StatBox
                label="Change"
                value={`${netWorthData.change >= 0 ? "+" : ""}${fmtINR(netWorthData.change)}`}
                sub={`${netWorthData.changePct >= 0 ? "+" : ""}${netWorthData.changePct.toFixed(1)}%`}
                color={netWorthData.change >= 0 ? "#059669" : THEME.rust}
              />
            </div>
            {netWorthData.chartData.length > 1 && (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netWorthData.chartData}>
                    <defs>
                      <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={THEME.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.muted }} />
                    <YAxis tick={{ fontSize: 11, fill: THEME.muted }} tickFormatter={(v: number) => fmtINR(v)} width={60} />
                    <Tooltip formatter={(v: number) => [fmtINRFull(v), "Net Worth"]} />
                    <Area type="monotone" dataKey="value" stroke={THEME.accent} fill="url(#nwGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* ─── (b) Income Summary ──────────────────────────────────── */}
          <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
            <SectionHeader icon={Wallet} title="Income Summary" id="income" />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatBox label="Total Income" value={fmtINR(incomeData.totalIncome)} color="#059669" />
              <StatBox label="Monthly Avg" value={fmtINR(incomeData.totalIncome / (fyMonthsElapsed || 12))} />
              <StatBox label="Sources" value={incomeData.breakdown.length} masked={false} />
            </div>

            {/* Category breakdown */}
            {incomeData.breakdown.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 10 }}>Breakdown by Category</div>
                {incomeData.breakdown.map((cat, idx) => (
                  <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: THEME.muted }}>{cat.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                      <Prv>{fmtINRFull(cat.value)}</Prv>
                    </span>
                    <span style={{ fontSize: 11, color: THEME.muted, minWidth: 40, textAlign: "right" }}>
                      {incomeData.totalIncome > 0 ? ((cat.value / incomeData.totalIncome) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Monthly income chart */}
            {incomeData.monthlyChart.some((d) => d.income > 0) && (
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeData.monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: THEME.muted }} />
                    <YAxis tick={{ fontSize: 10, fill: THEME.muted }} tickFormatter={(v: number) => fmtINR(v)} width={55} />
                    <Tooltip formatter={(v: number) => [fmtINRFull(v), "Income"]} />
                    <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* ─── (c) Expense Summary ─────────────────────────────────── */}
          <div className="page-break" />
          <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
            <SectionHeader icon={Receipt} title="Expense Summary" id="expense" />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatBox label="Total Expenses" value={fmtINR(expenseData.totalExpense)} color={THEME.rust} />
              <StatBox label="Monthly Avg" value={fmtINR(expenseData.avgMonthly)} />
              <StatBox label="Categories" value={expenseData.breakdown.length} masked={false} />
            </div>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {/* Category list */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 10 }}>Top Categories</div>
                {expenseData.breakdown.slice(0, 8).map((cat, idx) => (
                  <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: THEME.muted }}>{cat.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                      <Prv>{fmtINRFull(cat.value)}</Prv>
                    </span>
                  </div>
                ))}
              </div>

              {/* Pie chart */}
              {expenseData.top5.length > 0 && (
                <div style={{ width: 220, height: 220, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseData.top5}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={2}
                      >
                        {expenseData.top5.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtINRFull(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>

          {/* ─── (d) Savings & Investment ─────────────────────────────── */}
          <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
            <SectionHeader icon={PiggyBank} title="Savings & Investment" id="savings" />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <StatBox
                label="Net Savings"
                value={`${savingsData.savings >= 0 ? "+" : ""}${fmtINR(savingsData.savings)}`}
                color={savingsData.savings >= 0 ? "#059669" : THEME.rust}
              />
              <StatBox
                label="Savings Rate"
                value={`${savingsData.savingsRate.toFixed(1)}%`}
                color={savingsData.savingsRate >= 20 ? "#059669" : savingsData.savingsRate >= 10 ? "#d97706" : THEME.rust}
                masked={false}
              />
              <StatBox label="New Investments" value={fmtINR(savingsData.totalNewInvestments)} color={THEME.accent} />
            </div>

            {/* Investment breakdown */}
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 10 }}>Investment Additions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "Stocks", value: savingsData.stockBuys },
                { label: "Mutual Funds", value: savingsData.mfBuys },
                { label: "Fixed Deposits", value: savingsData.fdAdds },
                { label: "PPF", value: savingsData.ppfAdds },
                { label: "Active SIPs (annual)", value: savingsData.sipTotal },
              ].filter((r) => r.value > 0).map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", background: `${THEME.accent}06`, borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: THEME.muted }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}><Prv>{fmtINRFull(r.value)}</Prv></span>
                </div>
              ))}
            </div>

            {/* Realized gains */}
            {(savingsData.stcg !== 0 || savingsData.ltcg !== 0) && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 8, marginTop: 12 }}>Realized Capital Gains</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: `${THEME.accent}06` }}>
                    <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Short-Term (STCG)</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: savingsData.stcg >= 0 ? "#059669" : THEME.rust }}>
                      <Prv>{fmtINRFull(savingsData.stcg)}</Prv>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: "10px 14px", borderRadius: 8, background: `${THEME.accent}06` }}>
                    <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Long-Term (LTCG)</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: savingsData.ltcg >= 0 ? "#059669" : THEME.rust }}>
                      <Prv>{fmtINRFull(savingsData.ltcg)}</Prv>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* ─── (e) Asset Allocation ────────────────────────────────── */}
          <div className="page-break" />
          <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
            <SectionHeader icon={PieIcon} title="Asset Allocation" id="allocation" />
            {isPastFY && (
              <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 8, background: `${THEME.accent}08`, fontSize: 11, color: THEME.muted, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={12} />
                Asset allocation reflects current holdings — historical snapshot not available for past FYs.
              </div>
            )}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
              {/* Pie chart */}
              {assetAllocation.alloc.length > 0 && (
                <div style={{ width: 240, height: 240, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocation.alloc}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={2}
                      >
                        {assetAllocation.alloc.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtINRFull(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Allocation table */}
              <div style={{ flex: 1, minWidth: 200 }}>
                {assetAllocation.alloc.map((a, idx) => (
                  <div key={a.name} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>{a.name}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                        <Prv>{fmtINRFull(a.value)}</Prv>
                        <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 6 }}>
                          {assetAllocation.total > 0 ? ((a.value / assetAllocation.total) * 100).toFixed(0) : 0}%
                        </span>
                      </span>
                    </div>
                    <ProgressBar pct={assetAllocation.total > 0 ? (a.value / assetAllocation.total) * 100 : 0} color={PIE_COLORS[idx % PIE_COLORS.length]} />
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: `${THEME.accent}06` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Total Assets</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: THEME.accent }}>
                      <Prv>{fmtINRFull(assetAllocation.total)}</Prv>
                    </span>
                  </div>
                </div>
                {assetAllocation.prevNW > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: THEME.muted }}>
                    Previous FY-end net worth: <Prv>{fmtINRFull(assetAllocation.prevNW)}</Prv>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* ─── (f) Debt Summary ────────────────────────────────────── */}
          {(debtData.loanCount > 0 || debtData.ccOutstanding > 0) && (
            <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
              <SectionHeader icon={Landmark} title="Debt Summary" id="debt" />
              {isPastFY && (
                <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 8, background: `${THEME.accent}08`, fontSize: 11, color: THEME.muted, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={12} />
                  Debt figures reflect current outstanding — historical balances not available for past FYs.
                </div>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <StatBox label="Outstanding Loans" value={fmtINR(debtData.totalOutstanding)} color={THEME.rust} />
                <StatBox label="Monthly EMI" value={fmtINR(debtData.totalEMI)} />
                <StatBox label="Annual EMI" value={fmtINR(debtData.annualEMI)} />
              </div>
              <TableRow label="Active loans" value={debtData.loanCount} />
              <TableRow label="Total loan principal" value={fmtINRFull(debtData.totalPrincipal)} />
              <TableRow label="Estimated principal repaid (annual)" value={fmtINRFull(debtData.principalRepaid)} />
              <TableRow label="Estimated interest paid (annual)" value={fmtINRFull(debtData.interestPortion)} />
              {debtData.ccOutstanding > 0 && (
                <TableRow label="Credit card outstanding" value={fmtINRFull(debtData.ccOutstanding)} color={THEME.rust} />
              )}
            </Card>
          )}

          {/* ─── (g) Insurance Coverage ──────────────────────────────── */}
          {(insuranceData.licCount > 0 || insuranceData.termCount > 0) && (<>
            <div className="page-break" />
            <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
              <SectionHeader icon={Shield} title="Insurance Coverage" id="insurance" />
              {isPastFY && (
                <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 8, background: `${THEME.accent}08`, fontSize: 11, color: THEME.muted, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={12} />
                  Insurance data reflects current policies — historical coverage not available for past FYs.
                </div>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <StatBox label="Total Life Cover" value={fmtINR(insuranceData.totalLifeCover)} color={THEME.accent} />
                <StatBox label="Annual Premiums" value={fmtINR(insuranceData.totalPremiums)} />
                <StatBox
                  label="Coverage Ratio"
                  value={`${insuranceData.adequacyRatio.toFixed(1)}x`}
                  sub={insuranceData.adequacyRatio >= 10 ? "Adequate" : insuranceData.adequacyRatio >= 5 ? "Moderate" : "Low"}
                  color={insuranceData.adequacyRatio >= 10 ? "#059669" : insuranceData.adequacyRatio >= 5 ? "#d97706" : THEME.rust}
                  masked={false}
                />
              </div>
              <TableRow label="LIC / Endowment policies" value={insuranceData.licCount} />
              <TableRow label="Term life plans" value={insuranceData.termCount} />
              <TableRow label="Total life cover" value={fmtINRFull(insuranceData.totalLifeCover)} />
              <TableRow label="Annual premiums paid" value={fmtINRFull(insuranceData.totalPremiums)} />
              {insuranceData.adequacyRatio < 10 && incomeData.totalIncome > 0 && (
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#fef3c7", fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={14} />
                  <span>
                    Coverage is {insuranceData.adequacyRatio.toFixed(1)}x annual income.
                    Recommended: at least 10x ({fmtINR(incomeData.totalIncome * 10)}).
                  </span>
                </div>
              )}
            </Card>
          </>)}

          {/* ─── (h) Tax Summary ─────────────────────────────────────── */}
          {(taxData.totalTaxPaid > 0 || taxData.paymentCount > 0) && (
            <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
              <SectionHeader icon={Receipt} title="Tax Summary" id="tax" />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <StatBox label="Total Tax Paid" value={fmtINR(taxData.totalTaxPaid)} color={THEME.rust} />
                <StatBox label="Effective Rate" value={`${taxData.effectiveRate.toFixed(1)}%`} masked={false} />
                <StatBox label="Regime" value={taxData.regime === "new" ? "New" : "Old"} masked={false} />
              </div>
              {Object.entries(taxData.byType).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>Payment Breakdown</div>
                  {Object.entries(taxData.byType).map(([type, amount]) => (
                    <TableRow key={type} label={type} value={fmtINRFull(amount as number)} />
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ─── (i) Goals Progress ──────────────────────────────────── */}
          {goalsData.totalGoals > 0 && (
            <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
              <SectionHeader icon={Target} title="Goals Progress" id="goals" />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                <StatBox label="Total Goals" value={goalsData.totalGoals} masked={false} />
                <StatBox label="Completed" value={goalsData.completed} masked={false} />
                <StatBox label="Overall Progress" value={`${goalsData.overallPct.toFixed(0)}%`} color={THEME.accent} masked={false} />
              </div>
              {goalsData.topGoals.map((g) => (
                <div key={g.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>{g.name}</span>
                    <span style={{ fontSize: 12, color: THEME.muted }}>
                      <Prv>{fmtINR(g.saved)}</Prv> / <Prv>{fmtINR(g.target)}</Prv>
                      <span style={{ marginLeft: 6, fontWeight: 700, color: g.pct >= 100 ? "#059669" : THEME.accent }}>{g.pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <ProgressBar pct={g.pct} color={g.pct >= 100 ? "#059669" : g.pct >= 50 ? THEME.accent : "#d97706"} />
                </div>
              ))}
            </Card>
          )}

          {/* ─── (j) Key Highlights ──────────────────────────────────── */}
          {highlights.length > 0 && (<>
            <div className="page-break" />
            <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
              <SectionHeader icon={Sparkles} title="Key Highlights" id="highlights" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {highlights.map((h, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderRadius: 10, background: `${THEME.accent}06`, borderLeft: `3px solid ${h.color}` }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{h.icon}</span>
                    <span style={{ fontSize: 13, color: THEME.ink, lineHeight: 1.5 }}>{h.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>)}

          {/* ─── Financial Health Snapshot ────────────────────────────── */}
          <Card style={{ padding: "24px 28px", marginBottom: 20 }}>
            <SectionHeader icon={BarChart2} title="Financial Health Snapshot" id="health" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {[
                {
                  label: "Savings Rate",
                  value: `${savingsData.savingsRate.toFixed(0)}%`,
                  status: savingsData.savingsRate >= 30 ? "Excellent" : savingsData.savingsRate >= 20 ? "Good" : savingsData.savingsRate >= 10 ? "Fair" : "Low",
                  color: savingsData.savingsRate >= 30 ? "#059669" : savingsData.savingsRate >= 20 ? "#059669" : savingsData.savingsRate >= 10 ? "#d97706" : THEME.rust,
                },
                {
                  label: "Debt-to-Income",
                  value: incomeData.totalIncome > 0 ? `${((debtData.annualEMI / incomeData.totalIncome) * 100).toFixed(0)}%` : "0%",
                  status: incomeData.totalIncome > 0 && (debtData.annualEMI / incomeData.totalIncome) < 0.3 ? "Healthy" : incomeData.totalIncome > 0 && (debtData.annualEMI / incomeData.totalIncome) < 0.5 ? "Moderate" : debtData.annualEMI === 0 ? "No Debt" : "High",
                  color: debtData.annualEMI === 0 ? "#059669" : incomeData.totalIncome > 0 && (debtData.annualEMI / incomeData.totalIncome) < 0.3 ? "#059669" : "#d97706",
                },
                {
                  label: "Insurance Cover",
                  value: `${insuranceData.adequacyRatio.toFixed(1)}x`,
                  status: insuranceData.adequacyRatio >= 10 ? "Adequate" : insuranceData.adequacyRatio >= 5 ? "Moderate" : insuranceData.totalLifeCover === 0 ? "None" : "Low",
                  color: insuranceData.adequacyRatio >= 10 ? "#059669" : insuranceData.adequacyRatio >= 5 ? "#d97706" : THEME.rust,
                },
                {
                  label: "Goal Progress",
                  value: `${goalsData.overallPct.toFixed(0)}%`,
                  status: goalsData.overallPct >= 80 ? "On Track" : goalsData.overallPct >= 50 ? "In Progress" : goalsData.totalGoals === 0 ? "No Goals" : "Behind",
                  color: goalsData.overallPct >= 80 ? "#059669" : goalsData.overallPct >= 50 ? "#d97706" : goalsData.totalGoals === 0 ? THEME.muted : THEME.rust,
                },
              ].map((m) => (
                <div key={m.label} style={{ padding: "14px 16px", borderRadius: 10, background: `${THEME.accent}06`, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: m.color, letterSpacing: "-0.02em" }}>{m.value}</div>
                  <Badge variant={m.color === "#059669" ? "sage" : m.color === "#d97706" ? "gold" : "rust"} style={{ fontSize: 10, marginTop: 6 }}>
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── Footer ──────────────────────────────────────────────── */}
          <div style={{ textAlign: "center", padding: "16px 0 32px", fontSize: 11, color: THEME.muted }}>
            Generated on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} -- Personal Finance Dashboard
          </div>
        </>
      )}
    </div>
  );
};
