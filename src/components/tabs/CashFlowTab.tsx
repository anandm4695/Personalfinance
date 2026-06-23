// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Home,
  Banknote,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  Landmark,
  Receipt,
  Shield,
  Target,
  Activity,
  BarChart2,
  DollarSign,
  Building2,
  PiggyBank,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, today, getEffectiveRent } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Returns an array of { year, month, label } for the next N months starting from today. */
function getFutureMonths(count: number): { year: number; month: number; label: string; key: string }[] {
  const d = new Date();
  const months: { year: number; month: number; label: string; key: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const future = new Date(d.getFullYear(), d.getMonth() + i, 1);
    months.push({
      year: future.getFullYear(),
      month: future.getMonth(),
      label: `${MONTH_NAMES[future.getMonth()]} '${String(future.getFullYear()).slice(-2)}`,
      key: `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return months;
}

/** Parse a YYYY-MM-DD string into a Date (local timezone). */
function parseDate(s: string): Date | null {
  if (!s) return null;
  try {
    return new Date(s + "T00:00:00");
  } catch {
    return null;
  }
}

/** Check if a date string falls within a range of future months. */
function isDateInRange(dateStr: string, months: { key: string }[]): boolean {
  if (!dateStr) return false;
  const ym = dateStr.slice(0, 7);
  return months.some((m) => m.key === ym);
}

/** Find which month index a date falls into. Returns -1 if not in range. */
function getMonthIndex(dateStr: string, months: { key: string }[]): number {
  if (!dateStr) return -1;
  const ym = dateStr.slice(0, 7);
  return months.findIndex((m) => m.key === ym);
}

/** Convert frequency to monthly multiplier. */
function freqToMonthly(freq: string, amount: number): number {
  const f = (freq || "monthly").toLowerCase();
  if (f === "yearly" || f === "annual" || f === "annually") return amount / 12;
  if (f === "quarterly") return amount / 3;
  if (f === "half-yearly" || f === "semi-annual" || f === "semi-annually") return amount / 6;
  if (f === "weekly") return amount * 4.33;
  if (f === "daily") return amount * 30;
  return amount; // monthly
}

const fmtDate = (dateStr: string) => {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

// ── Component ────────────────────────────────────────────────────────────────

export const CashFlowTab = ({ state, metrics }: { state: any; metrics: any }) => {
  const [forecastMonths, setForecastMonths] = useState<3 | 6>(6);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    inflows: true,
    outflows: true,
    events: true,
  });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const months = useMemo(() => getFutureMonths(forecastMonths), [forecastMonths]);

  // ── INCOME SOURCES ─────────────────────────────────────────────────────────

  const inflows = useMemo(() => {
    const sources: { name: string; monthly: number; icon: any; category: string }[] = [];

    // 1. Salary
    const salaryEntries = (state.income || []).filter(
      (i: any) => (i.category || "").toLowerCase().includes("salary")
    );
    if (salaryEntries.length > 0) {
      // Use latest salary entry
      const sorted = [...salaryEntries].sort(
        (a: any, b: any) => (b.date || "").localeCompare(a.date || "")
      );
      const latest = Number(sorted[0]?.amount || 0);
      if (latest > 0) sources.push({ name: "Salary", monthly: latest, icon: Wallet, category: "Salary" });
    }

    // 2. Rental Income
    const rentalTotal = (state.rentalProperties || []).reduce(
      (sum: number, p: any) => sum + getEffectiveRent(p),
      0
    );
    if (rentalTotal > 0)
      sources.push({ name: "Rental Income", monthly: rentalTotal, icon: Home, category: "Rental" });

    // 3. Dividend Income
    const dividends = state.dividends || [];
    if (dividends.length > 0) {
      // Sum all dividend amounts and annualize based on date range
      const amounts = dividends.map((d: any) => Number(d.amount || d.totalAmount || 0));
      const totalDiv = amounts.reduce((s: number, a: number) => s + a, 0);
      const dates = dividends
        .map((d: any) => d.date || d.exDate || "")
        .filter(Boolean)
        .sort();
      let monthlyDiv = 0;
      if (dates.length >= 2) {
        const first = new Date(dates[0] + "T00:00:00");
        const last = new Date(dates[dates.length - 1] + "T00:00:00");
        const spanMonths = Math.max(
          1,
          (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth())
        );
        monthlyDiv = totalDiv / spanMonths;
      } else {
        // Single dividend — assume annual
        monthlyDiv = totalDiv / 12;
      }
      if (monthlyDiv > 0)
        sources.push({ name: "Dividends", monthly: monthlyDiv, icon: TrendingUp, category: "Dividends" });
    }

    // 4. Interest Income — FDs
    const fdInterest = (state.fixedDeposits || []).reduce((sum: number, fd: any) => {
      const principal = Number(fd.principal || fd.amount || 0);
      const rate = Number(fd.rate || fd.interestRate || 0);
      return sum + (principal * rate) / 100 / 12;
    }, 0);
    if (fdInterest > 0)
      sources.push({ name: "FD Interest", monthly: fdInterest, icon: Landmark, category: "Interest" });

    // Interest Income — RDs
    const rdInterest = (state.recurringDeposits || []).reduce((sum: number, rd: any) => {
      const monthly = Number(rd.monthlyDeposit || rd.amount || 0);
      const rate = Number(rd.rate || rd.interestRate || 0);
      // Rough estimate: average balance * rate / 12
      const tenure = Number(rd.tenureMonths || rd.tenure || 12);
      const avgBalance = (monthly * tenure) / 2;
      return sum + (avgBalance * rate) / 100 / 12;
    }, 0);
    if (rdInterest > 0)
      sources.push({ name: "RD Interest", monthly: rdInterest, icon: Landmark, category: "Interest" });

    // Interest Income — PPF
    const ppfInterest = (state.ppf || []).reduce((sum: number, p: any) => {
      const balance = Number(p.currentBalance || p.balance || 0);
      const rate = Number(p.interestRate || 7.1);
      return sum + (balance * rate) / 100 / 12;
    }, 0);
    if (ppfInterest > 0)
      sources.push({ name: "PPF Interest", monthly: ppfInterest, icon: PiggyBank, category: "Interest" });

    // 5. Other Income
    const otherIncome = (state.income || []).filter(
      (i: any) => !(i.category || "").toLowerCase().includes("salary")
    );
    if (otherIncome.length > 0) {
      const sorted = [...otherIncome].sort(
        (a: any, b: any) => (b.date || "").localeCompare(a.date || "")
      );
      // Take the latest 3 months of "other" income to average
      const recent = sorted.slice(0, 3);
      const avg = recent.reduce((s: number, i: any) => s + Number(i.amount || 0), 0) / Math.max(recent.length, 1);
      if (avg > 0)
        sources.push({ name: "Other Income", monthly: avg, icon: DollarSign, category: "Other" });
    }

    return sources;
  }, [state.income, state.rentalProperties, state.dividends, state.fixedDeposits, state.recurringDeposits, state.ppf]);

  // ── EXPENSE SOURCES ────────────────────────────────────────────────────────

  const outflows = useMemo(() => {
    const sources: { name: string; monthly: number; icon: any; category: string }[] = [];

    // 1. EMIs
    const emiTotal = (state.loansTaken || []).reduce(
      (sum: number, l: any) => sum + Number(l.emi || 0),
      0
    );
    if (emiTotal > 0)
      sources.push({ name: "Loan EMIs", monthly: emiTotal, icon: CreditCard, category: "EMI" });

    // 2. SIPs (active only)
    const sipTotal = (state.sips || []).reduce((sum: number, s: any) => {
      if ((s.status || "").toLowerCase() === "stopped") return sum;
      return sum + Number(s.amount || 0);
    }, 0);
    if (sipTotal > 0)
      sources.push({ name: "SIP Investments", monthly: sipTotal, icon: TrendingUp, category: "SIP" });

    // 3. Subscriptions
    const subTotal = (state.subscriptions || []).reduce((sum: number, s: any) => {
      if ((s.status || "").toLowerCase() === "cancelled" || (s.status || "").toLowerCase() === "inactive")
        return sum;
      const amt = Number(s.amount || s.price || 0);
      return sum + freqToMonthly(s.frequency || s.billing || "monthly", amt);
    }, 0);
    if (subTotal > 0)
      sources.push({ name: "Subscriptions", monthly: subTotal, icon: Receipt, category: "Subscriptions" });

    // 4. Recurring Expenses
    const recurringTotal = (state.recurringExpenses || []).reduce(
      (sum: number, e: any) => sum + Number(e.amount || 0),
      0
    );
    if (recurringTotal > 0)
      sources.push({ name: "Recurring Expenses", monthly: recurringTotal, icon: Activity, category: "Recurring" });

    // 5. Credit Card Bills
    const ccTotal = (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .reduce((sum: number, c: any) => sum + Number(c.outstanding || c.lastBill || 0), 0);
    if (ccTotal > 0)
      sources.push({ name: "Credit Card Bills", monthly: ccTotal, icon: CreditCard, category: "Credit Cards" });

    // 6. Rent Paid
    const rentPaid = (state.rentedProperties || []).reduce(
      (sum: number, p: any) => sum + getEffectiveRent(p),
      0
    );
    if (rentPaid > 0)
      sources.push({ name: "Rent Paid", monthly: rentPaid, icon: Home, category: "Rent" });

    // 7. Insurance Premiums
    const licPremium = (state.lic || []).reduce((sum: number, l: any) => {
      const annual = Number(l.annualPremium || l.premium || 0);
      return sum + annual / 12;
    }, 0);
    const termPremium = (state.termPlans || []).reduce((sum: number, t: any) => {
      const annual = Number(t.annualPremium || t.premium || 0);
      return sum + annual / 12;
    }, 0);
    const ulipPremium = (state.investmentPlans || []).reduce((sum: number, ip: any) => {
      const annual = Number(ip.annualPremium || ip.premium || 0);
      return sum + annual / 12;
    }, 0);
    const totalInsurance = licPremium + termPremium + ulipPremium;
    if (totalInsurance > 0)
      sources.push({ name: "Insurance Premiums", monthly: totalInsurance, icon: Shield, category: "Insurance" });

    // 8. Budget Spend
    const budgetTotal = (state.budgets || []).reduce(
      (sum: number, b: any) => sum + Number(b.monthly || b.monthlyLimit || b.limit || 0),
      0
    );
    if (budgetTotal > 0)
      sources.push({ name: "Budget Spend", monthly: budgetTotal, icon: Target, category: "Budget" });

    return sources;
  }, [
    state.loansTaken, state.sips, state.subscriptions, state.recurringExpenses,
    state.creditCards, state.rentedProperties, state.lic, state.termPlans,
    state.investmentPlans, state.budgets,
  ]);

  // ── ONE-TIME EVENTS ────────────────────────────────────────────────────────

  const events = useMemo(() => {
    const items: { date: string; name: string; amount: number; category: string; type: "inflow" | "outflow" }[] = [];

    // FD Maturities
    (state.fixedDeposits || []).forEach((fd: any) => {
      const matDate = fd.maturityDate || "";
      if (isDateInRange(matDate, months)) {
        const maturityAmount = Number(fd.maturityAmount || fd.principal || fd.amount || 0);
        items.push({
          date: matDate,
          name: `FD Maturity${fd.bankName ? ` — ${fd.bankName}` : ""}`,
          amount: maturityAmount,
          category: "FD Maturity",
          type: "inflow",
        });
      }
    });

    // RD Maturities
    (state.recurringDeposits || []).forEach((rd: any) => {
      const matDate = rd.maturityDate || "";
      if (isDateInRange(matDate, months)) {
        const maturityAmount = Number(rd.maturityAmount || 0);
        items.push({
          date: matDate,
          name: `RD Maturity${rd.bankName ? ` — ${rd.bankName}` : ""}`,
          amount: maturityAmount,
          category: "RD Maturity",
          type: "inflow",
        });
      }
    });

    // Insurance Premium Due
    const todayDate = new Date();
    [...(state.lic || []), ...(state.termPlans || []), ...(state.investmentPlans || [])].forEach(
      (policy: any) => {
        const premium = Number(policy.annualPremium || policy.premium || 0);
        if (premium <= 0) return;
        // Try to figure out next due date from policy start or last premium date
        const dueDate = policy.nextPremiumDate || policy.premiumDueDate || "";
        if (dueDate && isDateInRange(dueDate, months)) {
          items.push({
            date: dueDate,
            name: `Premium — ${policy.planName || policy.name || policy.provider || "Insurance"}`,
            amount: premium,
            category: "Insurance Premium",
            type: "outflow",
          });
        }
      }
    );

    // Loan Closures
    (state.loansTaken || []).forEach((loan: any) => {
      const endDate = loan.endDate || loan.closureDate || "";
      if (isDateInRange(endDate, months)) {
        items.push({
          date: endDate,
          name: `Loan Closure — ${loan.name || loan.lender || loan.type || "Loan"}`,
          amount: Number(loan.outstanding || loan.balance || 0),
          category: "Loan Closure",
          type: "outflow",
        });
      }
    });

    // Subscription Renewals (yearly subs)
    (state.subscriptions || []).forEach((sub: any) => {
      const freq = (sub.frequency || sub.billing || "monthly").toLowerCase();
      if (freq !== "yearly" && freq !== "annual" && freq !== "annually") return;
      if ((sub.status || "").toLowerCase() === "cancelled") return;
      const renewDate = sub.renewalDate || sub.nextBillingDate || "";
      if (renewDate && isDateInRange(renewDate, months)) {
        items.push({
          date: renewDate,
          name: `Renewal — ${sub.name || sub.service || "Subscription"}`,
          amount: Number(sub.amount || sub.price || 0),
          category: "Subscription Renewal",
          type: "outflow",
        });
      }
    });

    return items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [state.fixedDeposits, state.recurringDeposits, state.lic, state.termPlans, state.investmentPlans, state.loansTaken, state.subscriptions, months]);

  // ── CHART DATA ─────────────────────────────────────────────────────────────

  const totalMonthlyInflow = inflows.reduce((s, i) => s + i.monthly, 0);
  const totalMonthlyOutflow = outflows.reduce((s, o) => s + o.monthly, 0);
  const netMonthly = totalMonthlyInflow - totalMonthlyOutflow;
  const totalInflow = totalMonthlyInflow * forecastMonths;
  const totalOutflow = totalMonthlyOutflow * forecastMonths;
  // Add one-time event amounts
  const eventInflow = events.filter((e) => e.type === "inflow").reduce((s, e) => s + e.amount, 0);
  const eventOutflow = events.filter((e) => e.type === "outflow").reduce((s, e) => s + e.amount, 0);
  const grandInflow = totalInflow + eventInflow;
  const grandOutflow = totalOutflow + eventOutflow;
  const netCashFlow = grandInflow - grandOutflow;

  const chartData = useMemo(() => {
    let cumulative = 0;
    return months.map((m) => {
      // Add one-time events for this month
      const monthEventInflow = events
        .filter((e) => e.type === "inflow" && e.date.startsWith(m.key))
        .reduce((s, e) => s + e.amount, 0);
      const monthEventOutflow = events
        .filter((e) => e.type === "outflow" && e.date.startsWith(m.key))
        .reduce((s, e) => s + e.amount, 0);

      const inflow = totalMonthlyInflow + monthEventInflow;
      const outflow = totalMonthlyOutflow + monthEventOutflow;
      cumulative += inflow - outflow;

      return {
        month: m.label,
        Inflow: Math.round(inflow),
        Outflow: Math.round(outflow),
        Cumulative: Math.round(cumulative),
      };
    });
  }, [months, totalMonthlyInflow, totalMonthlyOutflow, events]);

  // ── EMPTY STATE ────────────────────────────────────────────────────────────

  const hasData = inflows.length > 0 || outflows.length > 0;

  if (!hasData) {
    return (
      <div>
        <SectionTitle sub="Forward-looking projection of your income, expenses, and one-time events">
          Cash Flow Forecast
        </SectionTitle>
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.sage})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Activity size={30} color="#fff" />
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: THEME.ink,
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            No Cash Flow Data Yet
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 420,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Add income entries, loans, SIPs, subscriptions, or budgets to see your projected cash flow
            over the next {forecastMonths} months.
          </div>
        </Card>
      </div>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  const summaryCards = [
    {
      label: "Total Projected Inflow",
      value: grandInflow,
      icon: ArrowUpRight,
      color: THEME.sage,
      bg: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
    },
    {
      label: "Total Projected Outflow",
      value: grandOutflow,
      icon: ArrowDownRight,
      color: THEME.rust,
      bg: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
    },
    {
      label: "Net Cash Flow",
      value: netCashFlow,
      icon: netCashFlow >= 0 ? TrendingUp : TrendingDown,
      color: netCashFlow >= 0 ? THEME.sage : THEME.rust,
      bg: netCashFlow >= 0
        ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
        : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
    },
    {
      label: "Monthly Surplus/Deficit",
      value: netMonthly,
      icon: netMonthly >= 0 ? ArrowUpRight : ArrowDownRight,
      color: netMonthly >= 0 ? THEME.sage : THEME.rust,
      bg: netMonthly >= 0
        ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
        : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
    },
  ];

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <SectionTitle
        sub="Forward-looking projection of your income, expenses, and one-time events"
        rightElement={
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant={forecastMonths === 3 ? "primary" : "secondary"}
              size="sm"
              onClick={() => setForecastMonths(3)}
            >
              3 Months
            </Button>
            <Button
              variant={forecastMonths === 6 ? "primary" : "secondary"}
              size="sm"
              onClick={() => setForecastMonths(6)}
            >
              6 Months
            </Button>
          </div>
        }
      >
        Cash Flow Forecast
      </SectionTitle>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {summaryCards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={fmtINR(Math.abs(c.value))}
            sub={`${forecastMonths}-month forecast`}
            icon={<c.icon />}
            color={c.color}
          />
        ))}
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <Card style={{ padding: 24, marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <BarChart2 size={18} style={{ color: THEME.accent }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>
            Monthly Cash Flow Projection
          </span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fontWeight: 700, fill: THEME.muted }}
              axisLine={{ stroke: THEME.line }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => fmtINR(v)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-0)",
                border: `1px solid ${THEME.line}`,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
              }}
              formatter={(value: number) => fmtINRFull(value)}
            />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
            <Bar dataKey="Inflow" fill={THEME.sage} radius={[6, 6, 0, 0]} maxBarSize={48} />
            <Bar dataKey="Outflow" fill={THEME.rust} radius={[6, 6, 0, 0]} maxBarSize={48} />
            <Line
              type="monotone"
              dataKey="Cumulative"
              stroke={THEME.accent}
              strokeWidth={2.5}
              dot={{ fill: THEME.accent, r: 4 }}
              name="Cumulative Surplus"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Inflows & Outflows Tables ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Regular Inflows */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div
            onClick={() => toggleSection("inflows")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              cursor: "pointer",
              borderBottom: expandedSections.inflows ? `1px solid ${THEME.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowUpRight size={16} style={{ color: THEME.sage }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>Regular Inflows</span>
              <Badge variant="sage">{inflows.length}</Badge>
            </div>
            {expandedSections.inflows ? (
              <ChevronDown size={16} style={{ color: THEME.muted }} />
            ) : (
              <ChevronRight size={16} style={{ color: THEME.muted }} />
            )}
          </div>
          {expandedSections.inflows && (
            <div style={{ padding: "0" }}>
              {inflows.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No regular inflows detected
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        fontSize: 11,
                        fontWeight: 700,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <th style={{ textAlign: "left", padding: "10px 20px" }}>Source</th>
                      <th style={{ textAlign: "right", padding: "10px 16px" }}>Monthly</th>
                      <th style={{ textAlign: "right", padding: "10px 20px" }}>{forecastMonths}-Mo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inflows.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: idx < inflows.length - 1 ? `1px solid ${THEME.line}` : "none",
                          }}
                        >
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Icon size={14} style={{ color: THEME.sage, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "12px 16px",
                              fontSize: 13,
                              fontWeight: 700,
                              color: THEME.sage,
                            }}
                          >
                            <Prv>{fmtINRFull(Math.round(item.monthly))}</Prv>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "12px 20px",
                              fontSize: 13,
                              fontWeight: 600,
                              color: THEME.muted,
                            }}
                          >
                            <Prv>{fmtINRFull(Math.round(item.monthly * forecastMonths))}</Prv>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr
                      style={{
                        borderTop: `2px solid ${THEME.line}`,
                        background: `color-mix(in srgb, ${THEME.sage} 5%, transparent)`,
                      }}
                    >
                      <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                        Total
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "12px 16px",
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.sage,
                        }}
                      >
                        <Prv>{fmtINRFull(Math.round(totalMonthlyInflow))}</Prv>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "12px 20px",
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.sage,
                        }}
                      >
                        <Prv>{fmtINRFull(Math.round(totalInflow))}</Prv>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>

        {/* Regular Outflows */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div
            onClick={() => toggleSection("outflows")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              cursor: "pointer",
              borderBottom: expandedSections.outflows ? `1px solid ${THEME.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowDownRight size={16} style={{ color: THEME.rust }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>Regular Outflows</span>
              <Badge variant="rust">{outflows.length}</Badge>
            </div>
            {expandedSections.outflows ? (
              <ChevronDown size={16} style={{ color: THEME.muted }} />
            ) : (
              <ChevronRight size={16} style={{ color: THEME.muted }} />
            )}
          </div>
          {expandedSections.outflows && (
            <div style={{ padding: "0" }}>
              {outflows.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                  No regular outflows detected
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        fontSize: 11,
                        fontWeight: 700,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <th style={{ textAlign: "left", padding: "10px 20px" }}>Source</th>
                      <th style={{ textAlign: "right", padding: "10px 16px" }}>Monthly</th>
                      <th style={{ textAlign: "right", padding: "10px 20px" }}>{forecastMonths}-Mo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outflows.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: idx < outflows.length - 1 ? `1px solid ${THEME.line}` : "none",
                          }}
                        >
                          <td style={{ padding: "12px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Icon size={14} style={{ color: THEME.rust, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "12px 16px",
                              fontSize: 13,
                              fontWeight: 700,
                              color: THEME.rust,
                            }}
                          >
                            <Prv>{fmtINRFull(Math.round(item.monthly))}</Prv>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "12px 20px",
                              fontSize: 13,
                              fontWeight: 600,
                              color: THEME.muted,
                            }}
                          >
                            <Prv>{fmtINRFull(Math.round(item.monthly * forecastMonths))}</Prv>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr
                      style={{
                        borderTop: `2px solid ${THEME.line}`,
                        background: `color-mix(in srgb, ${THEME.rust} 5%, transparent)`,
                      }}
                    >
                      <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                        Total
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "12px 16px",
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.rust,
                        }}
                      >
                        <Prv>{fmtINRFull(Math.round(totalMonthlyOutflow))}</Prv>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "12px 20px",
                          fontSize: 13,
                          fontWeight: 800,
                          color: THEME.rust,
                        }}
                      >
                        <Prv>{fmtINRFull(Math.round(totalOutflow))}</Prv>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Upcoming Events Timeline ───────────────────────────────────────── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div
          onClick={() => toggleSection("events")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            cursor: "pointer",
            borderBottom: expandedSections.events ? `1px solid ${THEME.line}` : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarClock size={16} style={{ color: THEME.accent }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>Upcoming Events</span>
            <Badge variant="accent">{events.length}</Badge>
          </div>
          {expandedSections.events ? (
            <ChevronDown size={16} style={{ color: THEME.muted }} />
          ) : (
            <ChevronRight size={16} style={{ color: THEME.muted }} />
          )}
        </div>
        {expandedSections.events && (
          <div style={{ padding: "0" }}>
            {events.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                No one-time events in the next {forecastMonths} months
              </div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {events.map((event, idx) => {
                  const isInflow = event.type === "inflow";
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 20px",
                        borderBottom: idx < events.length - 1 ? `1px solid ${THEME.line}` : "none",
                      }}
                    >
                      {/* Timeline dot */}
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: isInflow ? THEME.sage : THEME.rust,
                          flexShrink: 0,
                          boxShadow: `0 0 0 3px color-mix(in srgb, ${isInflow ? THEME.sage : THEME.rust} 20%, transparent)`,
                        }}
                      />
                      {/* Date */}
                      <div
                        style={{
                          minWidth: 80,
                          fontSize: 12,
                          fontWeight: 600,
                          color: THEME.muted,
                        }}
                      >
                        {fmtDate(event.date)}
                      </div>
                      {/* Name */}
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                        {event.name}
                      </div>
                      {/* Category Badge */}
                      <Badge variant={isInflow ? "sage" : "rust"}>
                        {event.category}
                      </Badge>
                      {/* Amount */}
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: isInflow ? THEME.sage : THEME.rust,
                          minWidth: 100,
                          textAlign: "right",
                        }}
                      >
                        <Prv>
                          {isInflow ? "+" : "-"}
                          {fmtINRFull(event.amount)}
                        </Prv>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
